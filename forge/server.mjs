import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomBytes,timingSafeEqual,randomUUID} from 'node:crypto';
import {seed} from './fixtures.mjs';
import {validateMission,validateWorker,matchWorkers,changeMission,reportIncident,aggregate,splitPayment,analyzeDemand,missionReadiness} from './core.mjs';

const dir=path.dirname(fileURLToPath(import.meta.url));
const statePath=path.join(path.resolve(process.env.FORGE_STATE_DIR||path.join(dir,'.local')),'demo-state.json');
const host=process.env.FORGE_HOST||'127.0.0.1';
const port=Number(process.env.FORGE_PORT||5100);
if(!Number.isInteger(port)||port<1||port>65535)throw new Error('Invalid local port');
const csrfToken=randomBytes(32).toString('hex');
const attempts=new Map();
if(host!=='127.0.0.1' && host!=='localhost') throw new Error('Sandbox must bind to localhost only. Add authentication before public hosting.');
let state;
try {state=JSON.parse(fs.readFileSync(statePath,'utf8'));if(!state.sandbox||!Array.isArray(state.missions)||!Array.isArray(state.workers))throw Error('Bad state');} catch {state=seed();}
function persist(){
 const stateDir=path.dirname(statePath);fs.mkdirSync(stateDir,{recursive:true,mode:0o700});
 const tmp=`${statePath}.${process.pid}.${randomUUID()}.tmp`;
 try {fs.writeFileSync(tmp,JSON.stringify(state,null,2),{mode:0o600,flag:'wx'});fs.renameSync(tmp,statePath);fs.chmodSync(statePath,0o600)}
 finally {try{fs.unlinkSync(tmp)}catch{}}
}
function headers(res){
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('X-Frame-Options','DENY');
 res.setHeader('Referrer-Policy','no-referrer');res.setHeader('Cross-Origin-Resource-Policy','same-origin');
 res.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=(), payment=()');
 res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'");
}
function respond(res,code,obj){res.writeHead(code,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(obj));}
function permittedHost(req){return ['127.0.0.1','localhost'].some(h=>req.headers.host===`${h}:${port}`)}
function checkToken(value){if(typeof value!=='string')return false;const v=Buffer.from(value,'utf8');const expected=Buffer.from(csrfToken,'utf8');return v.length===expected.length&&timingSafeEqual(v,expected)}
function rejectFlood(){const now=Date.now();for(const [k,v]of attempts)if(now-v.start>60_000)attempts.delete(k);const key='demo-local';const r=attempts.get(key)||{start:now,count:0};r.count++;attempts.set(key,r);return r.count>90}
class HttpError extends Error {constructor(status,message){super(message);this.status=status}}
function log(message){state.activity.unshift({id:randomUUID(),time:new Date().toISOString(),message});state.activity=state.activity.slice(0,40);persist();}
async function getBody(req){
 const max=16_000;if(Number(req.headers['content-length'])>max)throw new HttpError(413,'Request is too large');
 let size=0;const parts=[];for await(const chunk of req){size+=chunk.length;if(size>max)throw new HttpError(413,'Request is too large');parts.push(chunk)}
 let body;try{body=JSON.parse(Buffer.concat(parts).toString('utf8')||'{}')}catch{throw new HttpError(400,'Invalid JSON body')}
 if(!body||Array.isArray(body)||typeof body!=='object')throw new HttpError(400,'JSON object required');return body;
}
const route=async(req,res)=>{
 headers(res);
 try{
  if(!permittedHost(req))return respond(res,403,{error:'Unexpected host; local access only'});
  if(!['GET','POST'].includes(req.method))return respond(res,405,{error:'Method not allowed'});
  const url=new URL(req.url,'http://localhost');const pathname=url.pathname;let body={};
  if(req.method==='GET'&&(pathname==='/'||pathname==='/forge')){const file=fs.readFileSync(path.join(dir,'public','index.html'),'utf8');res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(file.replace('</head>',`<meta name="forge-csrf" content="${csrfToken}"></head>`));return;}
  if(req.method==='GET'&&pathname==='/app.js'){res.writeHead(200,{'Content-Type':'text/javascript; charset=utf-8','Cache-Control':'no-store'});res.end(fs.readFileSync(path.join(dir,'public','app.js')));return;}
  if(req.method==='GET'&&pathname==='/style.css'){res.writeHead(200,{'Content-Type':'text/css; charset=utf-8','Cache-Control':'no-store'});res.end(fs.readFileSync(path.join(dir,'public','style.css')));return;}
  if(req.method==='GET'&&pathname==='/api/forge'){respond(res,200,{sandbox:true,summary:aggregate(state.missions,state.workers),missions:state.missions,workers:state.workers,activity:state.activity});return;}
  if(req.method==='GET'&&pathname==='/api/forge/health'){respond(res,200,{status:'ok',sandbox:true,realPayments:false,realDispatch:false,publicLaunchReady:false});return;}
  if(req.method==='GET'&&pathname==='/api/forge/safety'){respond(res,200,{sandbox:true,publicLaunchReady:false,localOnly:true,realDispatch:false,realPayments:false,identityVerification:false,scopeFilter:'heuristic_only',safetyHolds:state.missions.filter(x=>x.safetyHold).map(m=>({id:m.id,title:m.title,severity:m.lastIncident?.severity||'UNSPECIFIED'})),launchBlockers:['Independent security testing and role-based authentication','Identity and business verification','Industry-appropriate insurance and licenses','Worker classification and written legal agreements','Incident response staffing and emergency escalation','Payment-provider onboarding, disputes and reconciliation','Privacy impact assessment and retention policy','Independent review of physical work hazards']});return;}
  if(req.method==='GET'&&pathname==='/api/forge/intelligence'){respond(res,200,analyzeDemand(state.missions,state.workers));return;}
  const analysis=pathname.match(/^\/api\/forge\/missions\/([^/]+)\/analysis$/);
  if(req.method==='GET'&&analysis){const mission=state.missions.find(x=>x.id===analysis[1]);if(!mission)return respond(res,404,{error:'Mission not found'});respond(res,200,missionReadiness(mission,state.workers));return;}
  const match=pathname.match(/^\/api\/forge\/missions\/([^/]+)\/matches$/);
  if(req.method==='GET'&&match){const mission=state.missions.find(x=>x.id===match[1]);if(!mission)return respond(res,404,{error:'Mission not found'});respond(res,200,{matches:matchWorkers(mission,state.workers),split:splitPayment(mission.priceCents),sandbox:true});return;}
  if(req.method==='POST'){
    if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']||''))return respond(res,415,{error:'POST requests require application/json'});
    const origin=req.headers.origin;
    if(origin){
      let trusted=false;
      try{const o=new URL(origin);trusted=(o.hostname==='127.0.0.1'||o.hostname==='localhost') && Number(o.port||80)===port;}catch{}
      if(!trusted)return respond(res,403,{error:'Cross-origin demo writes are forbidden'});
    }
    if(!checkToken(req.headers['x-forge-csrf']))return respond(res,403,{error:'Invalid local session token. Reload this page.'});
    if(rejectFlood())return respond(res,429,{error:'Rate limit reached. Try again shortly.'});
    body=await getBody(req);
  }
  if(req.method==='POST'&&pathname==='/api/forge/missions'){
   const result=validateMission(body);if(!result.ok)return respond(res,422,{errors:result.errors});state.missions.unshift(result.value);log(`New demo request created: ${result.value.title}`);return respond(res,201,{mission:result.value});
  }
  if(req.method==='POST'&&pathname==='/api/forge/workers'){
   const result=validateWorker(body);if(!result.ok)return respond(res,422,{errors:result.errors});state.workers.push(result.value);log(`Demo participant added: ${result.value.name}`);return respond(res,201,{worker:result.value});
  }
  const transition=pathname.match(/^\/api\/forge\/missions\/([^/]+)\/transition$/);
  if(req.method==='POST'&&transition){
   const index=state.missions.findIndex(x=>x.id===transition[1]);if(index<0)return respond(res,404,{error:'Mission not found'});
   const original=state.missions[index];const next=changeMission(original,body.status,body,state.workers);
   state.missions[index]=next;log(`Demo mission moved to ${next.status}: ${next.title}`);return respond(res,200,{mission:next});
  }
  const incident=pathname.match(/^\/api\/forge\/missions\/([^/]+)\/incident$/);
  if(req.method==='POST'&&incident){
   const index=state.missions.findIndex(x=>x.id===incident[1]);if(index<0)return respond(res,404,{error:'Mission not found'});
   state.missions[index]=reportIncident(state.missions[index],body.note,body.severity||'HIGH');
   log(`SAFETY HOLD (${body.severity||'HIGH'}): demo mission ${incident[1]} — no dispatch available`);
   return respond(res,200,{mission:state.missions[index],safetyHold:true,emergencyContacted:false,message:'Demo hold recorded. This application does NOT contact emergency services.'});
  }
  if(req.method==='POST'&&pathname==='/api/forge/reset'){
   state=seed();persist();return respond(res,200,{ok:true,sandbox:true});
  }
  respond(res,404,{error:'Not found'});
 }catch(e){if(!res.headersSent)respond(res,e instanceof HttpError?e.status:400,{error:e instanceof Error?e.message:'Request error'});}
};
const server=http.createServer(route);
server.listen(port,host,()=>console.log(`SniperX Forge demo: http://${host}:${port}\nSANDBOX ONLY — simulated buyers, participants, missions and payment figures. No real payments.`));
