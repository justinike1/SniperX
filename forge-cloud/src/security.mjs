import {randomBytes,createHash,scryptSync,timingSafeEqual} from 'node:crypto';
export class HttpError extends Error{constructor(status,message){super(message);this.status=status}}
export function fail(status,message){throw new HttpError(status,message)}
export const secret=()=>randomBytes(32).toString('base64url');
export const hashSecret=x=>createHash('sha256').update(x).digest('hex');
const SCRYPT={N:16384,r:8,p:1,maxmem:64*1024*1024};
export function validatePassword(p){if(typeof p!=='string'||p.length<14||p.length>128)fail(422,'Password must be 14–128 characters');}
export function hashPassword(p){validatePassword(p);const salt=randomBytes(16).toString('hex');return `scrypt$${salt}$${scryptSync(p,salt,64,SCRYPT).toString('hex')}`;}
export function verifyPassword(p,stored){if(typeof p!=='string'||p.length>128||!/^scrypt\$[a-f0-9]{32}\$[a-f0-9]{128}$/.test(stored||''))return false;const [,salt,hash]=stored.split('$');return timingSafeEqual(Buffer.from(hash,'hex'),scryptSync(p,salt,64,SCRYPT));}
export function normalizeEmail(x){if(typeof x!=='string')fail(422,'Valid email required');const email=x.trim().toLowerCase();if(email.length>200||! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))fail(422,'Valid email required');return email}
export function displayName(x){if(typeof x!=='string')fail(422,'Name required');const name=x.replace(/[\u0000-\u001f\u007f<>]/g,'').trim().slice(0,80);if(name.length<2)fail(422,'Name required');return name}
export function safeEqual(a,b){if(typeof a!=='string'||typeof b!=='string')return false;const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y)}
export function publicUser(u){return {id:u.id,email:u.email,role:u.role,displayName:u.display_name}}
export function securityHeaders(res){
 res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('X-Frame-Options','DENY');res.setHeader('Cache-Control','no-store');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('Cross-Origin-Resource-Policy','same-origin');
 res.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=(), payment=()');
 res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
}
export function parseCookie(header=''){const result={};for(const segment of header.split(';')){const ix=segment.indexOf('=');if(ix>0){let v=segment.slice(ix+1).trim();try{v=decodeURIComponent(v)}catch{}result[segment.slice(0,ix).trim()]=v}}return result;}
export function sessionCookie(token,secure){return `forge_session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Strict; ${secure?'Secure; ':''}Max-Age=604800`}
export function clearCookie(secure){return `forge_session=; Path=/; HttpOnly; SameSite=Strict; ${secure?'Secure; ':''}Max-Age=0`}
export function checkOrigin(req,origin){const given=req.headers.origin;if(given&&given!==origin)fail(403,'Invalid origin');if(req.headers['sec-fetch-site']==='cross-site')fail(403,'Cross-site access blocked');}
export async function readBody(req,max=24_000){if(Number(req.headers['content-length'])>max)fail(413,'Request too large');if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']||''))fail(415,'JSON required');let size=0;const chunks=[];for await(const c of req){size+=c.length;if(size>max)fail(413,'Request too large');chunks.push(c)}let data;try{data=JSON.parse(Buffer.concat(chunks).toString('utf8')||'{}')}catch{fail(400,'Malformed JSON')}if(!data||typeof data!=='object'||Array.isArray(data))fail(400,'JSON object required');return data;}
export function throttle(map,key,limit,windowMs){const now=Date.now();for(const [k,v] of map)if(v.until<now)map.delete(k);const r=map.get(key);if(!r||r.until<now){map.set(key,{count:1,until:now+windowMs});return}r.count++;if(r.count>limit)fail(429,'Too many requests, try again later')}
