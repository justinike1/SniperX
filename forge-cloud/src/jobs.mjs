/**
 * Forge Careers: provenance-first, read-only real employment listings.
 * These are EXTERNAL job advertisements, never Forge-funded missions.
 * API credentials and source boards must be configured by the operator.
 */
const approvedHttps=s=>{try{const u=new URL(s);return u.protocol==='https:'&&!u.username&&!u.password?u.href:null}catch{return null}};
const greenhouseURL=s=>{const link=approvedHttps(s);if(!link)return null;const h=new URL(link).hostname.toLowerCase();return ['boards.greenhouse.io','job-boards.greenhouse.io','boards.eu.greenhouse.io','job-boards.eu.greenhouse.io'].includes(h)?link:null};
const officialFederalURL=s=>{const link=approvedHttps(s);if(!link)return null;const h=new URL(link).hostname.toLowerCase();return (h.endsWith('.gov')||h.endsWith('.mil'))?link:null};
const clean=s=>typeof s==='string'?s.replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,250):'';
const normalizeDate=x=>{const t=Date.parse(x);return Number.isFinite(t)?new Date(t).toISOString():null};
const asJobs=(x)=>Array.isArray(x)?x:[];
const cfgTokens=raw=>[...new Set((raw||'').split(',').map(x=>x.trim().toLowerCase()).filter(x=>/^[a-z0-9_-]{2,80}$/.test(x)))].slice(0,12);
async function requestJSON(uri,{headers={},fetchImpl=fetch}={}){
 const r=await fetchImpl(uri,{headers,signal:AbortSignal.timeout(9000),redirect:'error'});
 if(!r.ok)throw Error(`Upstream returned HTTP ${r.status}`);
 const body=await r.json();return body;
}
export async function getGreenhouseJobs(boardToken,fetchImpl=fetch){
 if(!/^[a-z0-9_-]{2,80}$/.test(boardToken))throw Error('Invalid allowlisted board token');
 const url=`https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(boardToken)}/jobs`;
 const [list,board]=await Promise.all([requestJSON(url,{fetchImpl}),requestJSON(`https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(boardToken)}`,{fetchImpl})]);
 return asJobs(list.jobs).slice(0,500).flatMap(j=>{
  const link=greenhouseURL(j.absolute_url);if(!j.id||!link||!clean(j.title))return [];
  return [{sourceKey:`greenhouse:${boardToken}:${j.id}`,source:'GREENHOUSE',employer:clean(board.name)||boardToken,title:clean(j.title),location:clean(j.location?.name)||'Not specified',applyURL:link,postingUpdatedAt:normalizeDate(j.updated_at),expiresAt:null,sourceBoard:boardToken}];
 });
}
export async function getUSAJobs({apiKey,userAgent,keyword=''},fetchImpl=fetch){
 if(!apiKey||!userAgent)throw Error('USAJOBS credentials are not configured');
 const url=new URL('https://data.usajobs.gov/api/search');url.searchParams.set('ResultsPerPage','100');
 if(keyword)url.searchParams.set('Keyword',String(keyword).slice(0,70));
 const data=await requestJSON(url,{fetchImpl,headers:{'User-Agent':userAgent,'Authorization-Key':apiKey,'Accept':'application/json'}});
 return asJobs(data.SearchResult?.SearchResultItems).flatMap(row=>{
  const j=row.MatchedObjectDescriptor||{};const link=officialFederalURL(j.PositionURI);
  if(!link||!j.PositionID||!clean(j.PositionTitle))return [];
  return [{sourceKey:`usajobs:${clean(j.PositionID)}`,source:'USAJOBS',employer:clean(j.OrganizationName)||'Federal agency',title:clean(j.PositionTitle),location:clean(j.PositionLocationDisplay)||'See listing',applyURL:link,postingUpdatedAt:normalizeDate(j.PublicationStartDate),expiresAt:normalizeDate(j.ApplicationCloseDate),sourceBoard:'usajobs'}];
 });
}
export function saveJobBatch(store,jobs,now=new Date().toISOString()){
 return store.transaction(()=>{
  let saved=0;
  for(const j of jobs){
   if(!j.sourceKey||!approvedHttps(j.applyURL))continue;
   store.run(`INSERT INTO external_jobs(source_key,source,employer,title,location,apply_url,posting_updated_at,expires_at,last_verified_at,source_board)
      VALUES (?,?,?,?,?,?,?,?,?,?)
      ON CONFLICT(source_key) DO UPDATE SET employer=excluded.employer,title=excluded.title,location=excluded.location,apply_url=excluded.apply_url,
      posting_updated_at=excluded.posting_updated_at,expires_at=excluded.expires_at,last_verified_at=excluded.last_verified_at`,
    j.sourceKey,j.source,j.employer,j.title,j.location,j.applyURL,j.postingUpdatedAt,j.expiresAt,now,j.sourceBoard);
   saved++;
  }
  return saved;
 });
}
export function listCurrentJobs(store,{limit=100,now=Date.now()}={}){
 // Only show recently retrieved listings whose published closing date has not passed.
 const recent=new Date(now-3*24*60*60*1000).toISOString();const today=new Date(now).toISOString();
 return store.all(`SELECT source_key,source,employer,title,location,apply_url,posting_updated_at,expires_at,last_verified_at
   FROM external_jobs WHERE last_verified_at >= ? AND (expires_at IS NULL OR expires_at >= ?)
   ORDER BY last_verified_at DESC LIMIT ?`,recent,today,Math.min(100,Math.max(1,limit)))
  .map(r=>({sourceKey:r.source_key,source:r.source,employer:r.employer,title:r.title,location:r.location,applyURL:r.apply_url,postingUpdatedAt:r.posting_updated_at,expiresAt:r.expires_at,lastVerifiedAt:r.last_verified_at,verification:'SOURCE_RETRIEVED_NOT_EMPLOYER_VERIFIED',forgePaid:false}));
}
export async function refreshJobs(store,{env=process.env,fetchImpl=fetch}={}){
 const reports=[];let total=0;
 const tokens=cfgTokens(env.FORGE_GREENHOUSE_BOARDS);
 for(const token of tokens){try{const jobs=await getGreenhouseJobs(token,fetchImpl);const count=saveJobBatch(store,jobs);total+=count;reports.push({source:`greenhouse:${token}`,count,ok:true})}catch(e){reports.push({source:`greenhouse:${token}`,count:0,ok:false,error:e.message})}}
 if(env.USAJOBS_API_KEY&&env.USAJOBS_USER_AGENT){try{const jobs=await getUSAJobs({apiKey:env.USAJOBS_API_KEY,userAgent:env.USAJOBS_USER_AGENT},fetchImpl);const count=saveJobBatch(store,jobs);total+=count;reports.push({source:'USAJOBS',count,ok:true})}catch(e){reports.push({source:'USAJOBS',count:0,ok:false,error:e.message})}}
 return {count:total,reports,configuredSources:tokens.length+Number(!!(env.USAJOBS_API_KEY&&env.USAJOBS_USER_AGENT)),simulated:false,verifiedEmployer:false};
}
