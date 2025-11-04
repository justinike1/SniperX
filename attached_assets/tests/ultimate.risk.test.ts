
import { describe, it, expect } from "vitest";
import { KellySizer, DrawdownGuard, BudgetManager, VolatilityLimiter } from "../server/ultimate/risk";
describe("risk", () => {
  it("clips kelly", () => { const k=new KellySizer(0.2); expect(k.fraction(0.95)).toBeLessThanOrEqual(0.2); });
  it("dd blocks when large", () => { const d=new DrawdownGuard(0.1,0.2); d.update(100); d.update(70); expect(d.scale()).toBe(0); });
  it("budget limits", () => { const b=new BudgetManager(1.0,0.25); expect(b.canSpend(0.3).ok).toBe(false); expect(b.canSpend(0.2).ok).toBe(true); b.commit(0.2); expect(b.canSpend(0.9).ok).toBe(false); });
  it("vol filter sane", () => { const v=new VolatilityLimiter(50,20); for(let i=0;i<25;i++) v.push(100+i); expect(v.allowed()).toBe(true); });
});
