
import { StrategySignal, UltConfig, WalletInfo, TradeGateway, ExecResult } from "./types";
import { KellySizer, DrawdownGuard, BudgetManager, VolatilityLimiter, AdaptiveSlippage } from "./risk";
function softmax(ws:number[], t=0.5){ const m=Math.max(...ws); const ex=ws.map(w=>Math.exp((w-m)/Math.max(0.05,t))); const s=ex.reduce((a,b)=>a+b,0); return ex.map(x=>x/s); }
interface Ctx { last: Map<string, number>; equity: number; }
export class UltimateOrchestrator {
  private k: KellySizer; private dd: DrawdownGuard; private b: BudgetManager; private v: VolatilityLimiter; private s: AdaptiveSlippage; private ctx: Ctx={ last:new Map(), equity:0 };
  constructor(private cfg: UltConfig, private gw: TradeGateway){ this.k=new KellySizer(cfg.kellyCapPct); this.dd=new DrawdownGuard(cfg.riskOffDDPct/100, cfg.blockDDPct/100); this.b=new BudgetManager(cfg.maxDailySOL, cfg.maxPerTradeSOL); this.v=new VolatilityLimiter(cfg.maxVolPct); this.s=new AdaptiveSlippage(cfg.maxSlippagePct); }
  onCandle(token:string, price:number, equitySOL:number){ this.ctx.last.set(token, price); this.v.push(price); this.dd.update(equitySOL); this.ctx.equity=equitySOL; }
  async onSignals(wallet:WalletInfo, sigs:StrategySignal[]){ const usable=sigs.filter(s=>s.action!=="HOLD"); if(!usable.length) return { decided:"HOLD", sizeSOL:0, reason:"NO_SIGNAL" as const };
    if(!this.v.allowed()) return { decided:"HOLD", sizeSOL:0, reason:"VOL_TOO_HIGH" as const };
    if(wallet.balanceSOL < this.cfg.minWalletSOL) return { decided:"HOLD", sizeSOL:0, reason:"LOW_WALLET" as const };
    const probs=softmax(usable.map(s=>Math.max(0.01,s.confidence))); const pick=usable[probs.indexOf(Math.max(...probs))];
    const scale=this.dd.scale(); const kf=this.k.fraction(pick.confidence); let size=Math.max(0, Math.min(this.cfg.maxPerTradeSOL, this.ctx.equity*kf*scale)); if(pick.sizeHintPct) size=Math.min(size, this.ctx.equity*pick.sizeHintPct);
    const chk=this.b.canSpend(size); if(!chk.ok) return { decided:"HOLD", sizeSOL:0, reason:chk.reason as const };
    const last=this.ctx.last.get(pick.tokenMint); if(!last) return { decided:"HOLD", sizeSOL:0, reason:"NO_PRICE" as const };
    let res:ExecResult={ success:true };
    if (pick.action==="BUY") res=await this.gw.buy(pick.tokenMint, size);
    else if (pick.action==="SELL") res=await this.gw.sell(pick.tokenMint, size/last);
    else if (pick.action==="SHORT") res=await this.gw.short(pick.tokenMint, size, 2);
    else if (pick.action==="COVER") res=await this.gw.cover(pick.tokenMint, size);
    if(!res.success) return { decided:"HOLD", sizeSOL:0, reason:res.reason || "EXEC_FAIL" as const };
    this.b.commit(size); return { decided: pick.action, sizeSOL:size, reason: pick.reason || "ORCHESTRATED" };
  }
}
