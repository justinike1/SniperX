import EventEmitter from 'eventemitter3';
export type Intent = { id: string; type: 'BUY'|'SELL'; token: string; amount: number|string; denom: 'SOL'|'USD'|'TOKEN'; slippagePct: number; };
export class IntentQueue extends EventEmitter<{ intent: [Intent] }> { enqueue(i: Intent) { this.emit('intent', i); } }
