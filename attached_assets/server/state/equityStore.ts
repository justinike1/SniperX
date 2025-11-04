
export interface EquityPoint { ts: number; equity: number; }
const buf: EquityPoint[] = []; const MAX = 10_000;
export function addEquity(p: EquityPoint){ buf.push(p); if (buf.length > MAX) buf.shift(); }
export function getEquity(){ return buf.slice(); }
