import { PriceServiceConnection } from '@pythnetwork/price-service-client';
import EventEmitter from 'eventemitter3';
import { PYTH_PRICE_IDS } from '../config.tokens.js';

export type PriceTick = { symbol: string; priceUsd: number; ts: number };

export class PriceRouter extends EventEmitter<{ price: [PriceTick] }> {
  private conn: PriceServiceConnection;
  private latest = new Map<string, PriceTick>();
  private subscribed = false;

  constructor(endpoint = 'https://hermes.pyth.network') {
    super();
    this.conn = new PriceServiceConnection(endpoint, { priceFeedRequestConfig: { binary: true } });
  }

  get(symbol: string): PriceTick | undefined { return this.latest.get(symbol); }

  async prime(symbols: string[]) {
    const ids: string[] = [];
    for (const s of symbols) { const id = PYTH_PRICE_IDS[s]; if (id) ids.push(id); }
    if (ids.length === 0) return;
    const feeds = await this.conn.getLatestPriceFeeds(ids);
    const now = Date.now();
    for (const f of feeds ?? []) {
      const symbol = (f.product?.symbol ?? '').replace('Crypto.', '').replace('/USD','');
      const price = Number(f.price?.price ?? 0) * Math.pow(10, Number(f.price?.expo ?? 0));
      const tick: PriceTick = { symbol, priceUsd: price, ts: now };
      this.latest.set(symbol, tick); this.emit('price', tick);
    }
    if (!this.subscribed) {
      this.subscribed = true;
      this.conn.subscribePriceFeedUpdates(ids, (update) => {
        for (const u of update) {
          const id = (u as any).id ?? (u as any)?.priceFeed?.id ?? '';
          const price = Number(u.price?.price ?? 0) * Math.pow(10, Number(u.price?.expo ?? 0));
          const tick: PriceTick = { symbol: id, priceUsd: price, ts: Date.now() };
          this.latest.set(id, tick); this.emit('price', tick);
        }
      });
    }
  }
}
