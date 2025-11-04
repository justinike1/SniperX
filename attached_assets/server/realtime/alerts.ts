
import { env } from "../utils/env";
export async function sendTelegram(msg: string) {
  if (!env().TELEGRAM_ENABLED || !env().TELEGRAM_BOT_TOKEN || !env().TELEGRAM_CHAT_ID) return { ok: false, reason: "DISABLED" };
  try {
    const r = await fetch(`https://api.telegram.org/bot${env().TELEGRAM_BOT_TOKEN}/sendMessage`, { method:"POST", headers:{ "content-type":"application/json" }, body: JSON.stringify({ chat_id: env().TELEGRAM_CHAT_ID, text: msg }) });
    return { ok: r.ok };
  } catch { return { ok: false }; }
}
export class AlertManager {
  private riskOffSent=false; private blockSent=false;
  constructor(private riskOffDD: number, private blockDD: number){}
  reset(){ this.riskOffSent=false; this.blockSent=false; }
  async onDrawdown(ddPct: number){
    if (!this.riskOffSent && ddPct >= this.riskOffDD) { this.riskOffSent=true; await sendTelegram(`⚠️ Drawdown ${ddPct.toFixed(2)}% (risk-off).`); }
    if (!this.blockSent && ddPct >= this.blockDD) { this.blockSent=true; await sendTelegram(`🛑 Drawdown ${ddPct.toFixed(2)}% (blocked).`); }
    if (ddPct < this.riskOffDD * 0.5) this.reset();
  }
  async onPolicyBlock(reason: string){ await sendTelegram(`🚫 Trade blocked: ${reason}`); }
}
