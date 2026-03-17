interface FearGreedData {
  value: number;
  valueText: string;
  timestamp: string;
}

interface SentimentResult {
  fearGreedIndex: number;
  sentiment: string;
  emoji: string;
  description: string;
  tradingSignal: string;
}

class MarketSentimentService {
  private cache: { data: SentimentResult; fetchedAt: number } | null = null;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  private getSentimentLabel(value: number): { sentiment: string; emoji: string; description: string; signal: string } {
    if (value <= 20) return {
      sentiment: 'EXTREME FEAR',
      emoji: '😱',
      description: 'Market is extremely fearful. Historically a buying opportunity.',
      signal: '🟢 Strong BUY signal - others are panicking'
    };
    if (value <= 40) return {
      sentiment: 'FEAR',
      emoji: '😰',
      description: 'Market sentiment is fearful. Could be a good entry point.',
      signal: '🟡 Cautious BUY - consider averaging in'
    };
    if (value <= 60) return {
      sentiment: 'NEUTRAL',
      emoji: '😐',
      description: 'Market is balanced. No strong directional signal.',
      signal: '⚪ HOLD - wait for clearer signals'
    };
    if (value <= 80) return {
      sentiment: 'GREED',
      emoji: '🤑',
      description: 'Market is greedy. Be cautious about new entries.',
      signal: '🟡 CAUTION - consider taking partial profits'
    };
    return {
      sentiment: 'EXTREME GREED',
      emoji: '🚨',
      description: 'Market is extremely greedy. High risk of correction.',
      signal: '🔴 SELL signal - take profits, others are euphoric'
    };
  }

  async getSentiment(): Promise<SentimentResult> {
    if (this.cache && Date.now() - this.cache.fetchedAt < this.CACHE_TTL) {
      return this.cache.data;
    }

    try {
      const response = await fetch(
        'https://api.alternative.me/fng/?limit=1',
        { signal: AbortSignal.timeout(8000) }
      );

      if (!response.ok) throw new Error('API unavailable');

      const json = await response.json() as any;
      const entry: FearGreedData = json.data?.[0];
      const value = parseInt(entry?.value || '50');

      const labels = this.getSentimentLabel(value);
      const result: SentimentResult = {
        fearGreedIndex: value,
        sentiment: labels.sentiment,
        emoji: labels.emoji,
        description: labels.description,
        tradingSignal: labels.signal
      };

      this.cache = { data: result, fetchedAt: Date.now() };
      return result;
    } catch {
      // Return neutral as fallback
      return {
        fearGreedIndex: 50,
        sentiment: 'NEUTRAL',
        emoji: '😐',
        description: 'Could not fetch sentiment data.',
        tradingSignal: '⚪ No signal available'
      };
    }
  }

  async formatSentimentReport(): Promise<string> {
    const s = await this.getSentiment();
    const bar = this.buildBar(s.fearGreedIndex);

    return `🧠 *MARKET SENTIMENT*\n\n` +
      `${s.emoji} *${s.sentiment}*\n` +
      `Index: ${s.fearGreedIndex}/100\n\n` +
      `${bar}\n\n` +
      `📝 ${s.description}\n\n` +
      `${s.tradingSignal}`;
  }

  private buildBar(value: number): string {
    const filled = Math.round(value / 10);
    const bar = '█'.repeat(filled) + '░'.repeat(10 - filled);
    return `Fear [${bar}] Greed`;
  }
}

export const marketSentiment = new MarketSentimentService();
