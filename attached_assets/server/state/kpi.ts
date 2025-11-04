
import type { EquityPoint } from "./equityStore";
import { getEquity } from "./equityStore";
export interface KPISummary {
  startTs: number; endTs: number; bars: number;
  initialEquity: number; finalEquity: number;
  returnPct: number; cagrPct: number; sharpe: number;
  maxDrawdownPct: number; currentDrawdownPct: number;
  tradesOk: number; blocks: number;
}
let tradesOk = 0, blocks = 0;
export function recordTradeOk(){ tradesOk++; }
export function recordBlock(){ blocks++; }
function maxDD(points: EquityPoint[]){ let peak = -Infinity, maxD=0, curD=0; for (const p of points){ if (p.equity > peak) peak = p.equity; const d = peak>0 ? (peak - p.equity)/peak : 0; if (d>maxD) maxD=d; curD=d; } return { maxD, curD }; }
function sharpe(points: EquityPoint[]){ if (points.length < 3) return 0; const rets:number[]=[]; for (let i=1;i<points.length;i++){ const a=points[i-1].equity,b=points[i].equity; if (a>0) rets.push((b-a)/a); } if (!rets.length) return 0; const avg=rets.reduce((x,y)=>x+y,0)/rets.length; const v=rets.reduce((x,y)=>x+(y-avg)**2,0)/rets.length; const sd=Math.sqrt(v)||1e-9; return (avg/sd)*Math.sqrt(252); }
export function getKpis(): KPISummary {
  const points = getEquity(); const startTs = points[0]?.ts ?? 0, endTs = points.at(-1)?.ts ?? 0;
  const initial = points[0]?.equity ?? 0, final = points.at(-1)?.equity ?? 0;
  const ret = initial>0 ? (final-initial)/initial : 0; const years=Math.max(1/365,(endTs-startTs)/(1000*60*60*24*365));
  const cagr = Math.pow(1+ret, 1/years)-1; const { maxD, curD } = maxDD(points);
  return { startTs, endTs, bars: points.length, initialEquity: initial, finalEquity: final, returnPct:+(ret*100).toFixed(2), cagrPct:+(cagr*100).toFixed(2), sharpe:+sharpe(points).toFixed(2), maxDrawdownPct:+(maxD*100).toFixed(2), currentDrawdownPct:+(curD*100).toFixed(2), tradesOk, blocks };
}
