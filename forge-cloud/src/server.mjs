import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { openStore } from './db.mjs';
import { checkOrigin, clearCookie, readBody, securityHeaders, sessionCookie, throttle } from './security.mjs';
import { currentSession, handle } from './handlers.mjs';

const ROOT=path.dirname(fileURLToPath(import.meta.url));
const STATIC=path.join(ROOT,'..','public');
const MIME={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.ico':'image/x-icon'};
const limits=new Map();

export function createForgeServer({dbPath=process.env.FORGE_DB_PATH||path.resolve('data/forge.sqlite'),publicOrigin=process.env.FORGE_PUBLIC_ORIGIN||'http://127.0.0.1:5200',store=openStore(dbPath)}={}){
  const url=new URL(publicOrigin);
  if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.pathname!=='/'||url.search)throw new Error('FORGE_PUBLIC_ORIGIN must be an exact http(s) origin with no path');
  const secure=url.protocol==='https:';
  if(process.env.NODE_ENV==='production'&&!secure)throw Error('Production requires HTTPS FORGE_PUBLIC_ORIGIN');
  const server=http.createServer(async(req,res)=>{
    securityHeaders(res);
    res.setHeader('Content-Type','application/json; charset=utf-8');
    let pathname;
    try{
      const requestURL=new URL(req.url||'/',publicOrigin);pathname=requestURL.pathname;
      const method=req.method||'GET';
      if(!['GET','POST','HEAD'].includes(method)){res.writeHead(405);return res.end(JSON.stringify({error:'Method not allowed'}))}
      if(!pathname.startsWith('/api/')){
        if(!['GET','HEAD'].includes(method)) {res.writeHead(405);return res.end(JSON.stringify({error:'Method not allowed'}))}
        const relative=pathname==='/'?'index.html':pathname.slice(1);
        const allow=new Set(['index.html','app.js','style.css','radar.css','favicon.svg']);
        if(!allow.has(relative)){res.writeHead(404);return res.end(JSON.stringify({error:'Not found'}))}
        const data=await fs.promises.readFile(path.join(STATIC,relative));
        res.setHeader('Content-Type',MIME[path.extname(relative)]||'application/octet-stream');
        res.setHeader('X-Content-Type-Options','nosniff');
        res.writeHead(200);return res.end(method==='HEAD'?undefined:data);
      }
      // Limit requests per remote address; reverse-proxy deployments require edge-level rate limits too.
      const address=req.socket.remoteAddress||'unknown';
      throttle(limits,`${address}:all`,200,60_000);
      if(pathname==='/api/auth/login'||pathname==='/api/auth/register')throttle(limits,`${address}:${pathname}`,10,60_000);
      let body={};
      if(method==='POST'){
        checkOrigin(req,publicOrigin);
        body=await readBody(req);
      }
      const ctx={store,method,path:pathname,query:requestURL.searchParams,body,res,secure,cookies:{},session:null,user:null,sessionToken:null,
        sessionCookie:token=>sessionCookie(token,secure),clearCookie:()=>clearCookie(secure)};
      // Session tokens must be HttpOnly cookies, never carried in query strings.
      const cookieHeader=req.headers.cookie||'';
      for(const segment of cookieHeader.split(';')){const ix=segment.indexOf('=');if(ix>0&&segment.slice(0,ix).trim()==='forge_session'){
        try{ctx.cookies.forge_session=decodeURIComponent(segment.slice(ix+1).trim())}catch{}
      }}
      const auth=currentSession(ctx);
      if(auth){ctx.session=auth.session;ctx.user=auth.user;ctx.sessionToken=auth.token;ctx.csrf=auth.csrf}
      if(method==='POST'&&!['/api/auth/login','/api/auth/register'].includes(pathname)){
        if(!ctx.user)throw Object.assign(new Error('Authentication required'),{status:401});
        const provided=req.headers['x-forge-csrf'];
        if(typeof provided!=='string'||provided!==ctx.csrf)throw Object.assign(new Error('Invalid request token'),{status:403});
      }
      const payload=await handle(ctx);
      res.writeHead(200);res.end(JSON.stringify(payload));
    }catch(error){
      const status=Number.isInteger(error?.status)&&error.status>=400&&error.status<=499?error.status:500;
      if(status===500)console.error('[forge] request error',error);
      if(!res.headersSent){res.writeHead(status);res.end(JSON.stringify({error:status===500?'Internal server error':error.message}))}
      else res.end();
    }
  });
  return {server,store,close:async()=>{await new Promise((resolve,reject)=>server.close(err=>err?reject(err):resolve()));store.close()}};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  const origin=process.env.FORGE_PUBLIC_ORIGIN||'http://127.0.0.1:5200';
  const uri=new URL(origin);
  const port=Number(process.env.PORT)||Number(uri.port)||5200;
  const host=process.env.FORGE_BIND_HOST||'127.0.0.1';
  if(!['127.0.0.1','::1'].includes(host)&&process.env.FORGE_ALLOW_REMOTE!=='YES')throw new Error('Refusing remote bind without FORGE_ALLOW_REMOTE=YES');
  const {server}=createForgeServer({publicOrigin:origin});
  server.listen(port,host,()=>console.log(`[forge] invite-only private beta listening on ${host}:${port}; public launch DISABLED; real payments DISABLED`));
}
