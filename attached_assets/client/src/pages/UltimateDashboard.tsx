
import React, { useEffect, useRef, useState } from "react";
type EquityPoint={ ts:number; equity:number }; type MetricRow={ name:string; labels:Record<string,string>; value:number };
type KPISummary={ startTs:number; endTs:number; bars:number; initialEquity:number; finalEquity:number; returnPct:number; cagrPct:number; sharpe:number; maxDrawdownPct:number; currentDrawdownPct:number; tradesOk:number; blocks:number; };
function useSSE(url:string){ const [events,set]=useState<any[]>([]); useEffect(()=>{ const es=new EventSource(url); const h=(e:MessageEvent)=>{ try{ set(p=>[...p.slice(-199), JSON.parse(e.data)]);}catch{} }; es.addEventListener("signal",h as any); es.addEventListener("decision",h as any); es.addEventListener("candle",h as any); return ()=>es.close();},[url]); return events; }
function useMetrics(url:string,poll=5000){ const [rows,set]=useState<MetricRow[]>([]); useEffect(()=>{ let stop=false; const tick=async()=>{ try{ const txt=await fetch(url).then(r=>r.text()); const out:MetricRow[]=[]; for(const ln of txt.split(/\n/)){ if(!ln||ln.startsWith("#")) continue; const m=ln.match(/^(\w+)(\{[^}]*\})?\s+([0-9.]+)/); if(m){ const name=m[1]; const lbls:Record<string,string>={}; if(m[2]) m[2].slice(1,-1).split(",").forEach(kv=>{ const [k,v]=kv.split("="); lbls[k.trim()]=v.replace(/(^"|"$)/g,""); }); out.push({name,labels:lbls,value:Number(m[3])}); } } if(!stop) set(out);}catch{} if(!stop) setTimeout(tick,poll);}; tick(); return ()=>{ stop=true; };},[url,poll]); return rows; }
function useEquity(url:string,poll=3000){ const [pts,set]=useState<EquityPoint[]>([]); useEffect(()=>{ let stop=false; const tick=async()=>{ try{ const j=await fetch(url).then(r=>r.json()); if(!stop&&j?.ok) set(j.points||[]);}catch{} if(!stop) setTimeout(tick,poll);}; tick(); return ()=>{ stop=true; };},[url,poll]); return pts; }
function useKpis(url:string,poll=5000){ const [k,setK]=useState<KPISummary|null>(null); useEffect(()=>{ let stop=false; const tick=async()=>{ try{ const j=await fetch(url).then(r=>r.json()); if(!stop&&j?.ok) setK(j.kpis);}catch{} if(!stop) setTimeout(tick,poll);}; tick(); return ()=>{ stop=true; };},[url,poll]); return k; }
function Chart({ data, h=220 }:{ data:EquityPoint[]; h?:number}){ const ref=useRef<HTMLCanvasElement|null>(null); useEffect(()=>{ const el=ref.current; if(!el) return; const ctx=el.getContext("2d"); if(!ctx) return; const W=el.width=el.clientWidth, H=el.height=h; ctx.clearRect(0,0,W,H); if(data.length<2) return; const xs=data.map(d=>d.ts), ys=data.map(d=>d.equity); const xmin=Math.min(...xs),xmax=Math.max(...xs),xr=xmax-xmin||1; const ymin=Math.min(...ys),ymax=Math.max(...ys),yr=ymax-ymin||1; ctx.lineWidth=2; ctx.beginPath(); data.forEach((d,i)=>{ const x=((d.ts-xmin)/xr)*(W-6)+3; const y=H-((d.equity-ymin)/yr)*(H-6)-3; if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);}); ctx.stroke(); },[data,h]); return <canvas ref={ref} style={{ width:"100%", height:h }} />; }
function Stat({label,value,sub}:{label:string;value:string|number;sub?:string}){ return (<div><div style={{fontSize:12,color:"#666"}}>{label}</div><div style={{fontSize:22}}>{value}</div>{sub&&<div style={{fontSize:11,color:"#888"}}>{sub}</div>}</div>); }
export default function UltimateDashboard(){
  const base=""; const events=useSSE(`${base}/ultimate/events`); const metrics=useMetrics(`${base}/metrics`); const equity=useEquity(`${base}/ultimate/equity`); const kpis=useKpis(`${base}/ultimate/kpis`);
  const tradesOk=metrics.filter(m=>m.name==="sniperx_trades_total"&&m.labels.result==="ok").reduce((a,b)=>a+b.value,0);
  const tradesDry=metrics.filter(m=>m.name==="sniperx_trades_total"&&m.labels.result==="dry_run").reduce((a,b)=>a+b.value,0);
  const blocks=metrics.filter(m=>m.name==="sniperx_safety_blocks_total").reduce((a,b)=>a+b.value,0);
  return (<div style={{padding:16,fontFamily:"ui-sans-serif, system-ui, -apple-system"}}>
    <h1>SniperX — Ultimate Dashboard</h1>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
      <div style={{border:"1px solid #ddd",borderRadius:8,padding:12}}>
        <h3>Equity</h3><Chart data={equity}/>
      </div>
      <div style={{border:"1px solid #ddd",borderRadius:8,padding:12}}>
        <h3>KPIs</h3>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16}}>
          <Stat label="Return" value={kpis?`${kpis.returnPct}%`:"-"} sub="Total"/>
          <Stat label="CAGR" value={kpis?`${kpis.cagrPct}%`:"-"}/>
          <Stat label="Sharpe" value={kpis?.sharpe ?? "-"}/>
          <Stat label="Max DD" value={kpis?`${kpis.maxDrawdownPct}%`:"-"}/>
          <Stat label="Current DD" value={kpis?`${kpis.currentDrawdownPct}%`:"-"}/>
          <Stat label="Bars" value={kpis?.bars ?? "-"}/>
        </div>
        <div style={{marginTop:12,fontSize:12,color:"#666"}}>Trades OK: {tradesOk} | Dry-Run: {tradesDry} | Blocks: {kpis?.blocks ?? blocks}</div>
      </div>
    </div>
    <div style={{marginTop:16,border:"1px solid #ddd",borderRadius:8,padding:12}}>
      <h3>Live Feed</h3>
      <div style={{maxHeight:300,overflow:"auto"}}>
        {events.slice().reverse().map((e,i)=>(<div key={i} style={{padding:"6px 0",borderBottom:"1px dashed #eee"}}><code style={{fontSize:12}}>{JSON.stringify(e)}</code></div>))}
      </div>
      <div style={{marginTop:8,fontSize:12,color:"#666"}}>Stream: /ultimate/events (SSE)</div>
    </div>
  </div>);
}
