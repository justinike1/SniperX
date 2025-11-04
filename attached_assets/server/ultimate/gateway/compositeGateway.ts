
import type { TradeGateway, ExecResult } from "../types";
import { env } from "../../utils/env";
import { JupiterGateway } from "./jupiterGateway";
import { DriftGateway } from "./driftGateway";
import { resolveTokenMint, resolvePerpSymbol } from "../registry/tokens";
class DryRun implements TradeGateway { async buy(): Promise<ExecResult> { return { success: true }; } async sell(): Promise<ExecResult> { return { success: true }; } async short(): Promise<ExecResult> { return { success: true }; } async cover(): Promise<ExecResult> { return { success: true }; } }
function normalizeToken(input: string): string { const mint = resolveTokenMint(input); if (!mint) throw new Error(`UNKNOWN_TOKEN:${input}`); return mint; }
export class CompositeGateway implements TradeGateway {
  private dry = new DryRun(); private spot = new JupiterGateway(); private perp = new DriftGateway();
  async buy(token: string, amountSol: number): Promise<ExecResult> { const tokenMint = normalizeToken(token); if (env().DRY_RUN || !env().ENABLE_SPOT_LIVE) return this.dry.buy(tokenMint, amountSol); return this.spot.buy(tokenMint, amountSol); }
  async sell(token: string, amountTokens: number): Promise<ExecResult> { const tokenMint = normalizeToken(token); if (env().DRY_RUN || !env().ENABLE_SPOT_LIVE) return this.dry.sell(tokenMint, amountTokens); return this.spot.sell(tokenMint, amountTokens); }
  async short(token: string, sizeSol: number, leverage: number): Promise<ExecResult> { resolvePerpSymbol(token); if (env().DRY_RUN || !env().ENABLE_PERP_LIVE) return this.dry.short(token, sizeSol, leverage); return this.perp.short(token, sizeSol, leverage); }
  async cover(token: string, sizeSol: number): Promise<ExecResult> { resolvePerpSymbol(token); if (env().DRY_RUN || !env().ENABLE_PERP_LIVE) return this.dry.cover(token, sizeSol); return this.perp.cover(token, sizeSol); }
}
