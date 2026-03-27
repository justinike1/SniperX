const LIVE_TRADING_ENABLED_VALUE = "true";
const LIVE_TRADING_CONFIRMATION_VALUE = "I_UNDERSTAND";

export const LIVE_TRADING_DISABLED_REASON = "LIVE_TRADING_DISABLED";

export class LiveTradingDisabledError extends Error {
  code: string;

  constructor(message: string) {
    super(message);
    this.name = "LiveTradingDisabledError";
    this.code = LIVE_TRADING_DISABLED_REASON;
  }
}

export function isLiveTradingEnabled(): boolean {
  return getLiveTradingGuardStatus().enabled;
}

export function assertLiveTradingEnabled(context = "live execution"): void {
  const status = getLiveTradingGuardStatus();
  if (status.enabled) return;
  throw new LiveTradingDisabledError(
    `${LIVE_TRADING_DISABLED_REASON}: ${context} blocked (${status.message})`
  );
}

export function isLiveTradingDisabledError(error: unknown): boolean {
  return (
    error instanceof LiveTradingDisabledError ||
    (typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === LIVE_TRADING_DISABLED_REASON)
  );
}

function getLiveTradingGuardStatus(): { enabled: boolean; message: string } {
  const liveTradingFlag = (process.env.ENABLE_LIVE_TRADING || "").trim();
  if (liveTradingFlag !== LIVE_TRADING_ENABLED_VALUE) {
    return {
      enabled: false,
      message: 'set ENABLE_LIVE_TRADING="true" to enable sending live swaps',
    };
  }

  const confirmation = (process.env.LIVE_TRADING_CONFIRMATION || "").trim();
  if (confirmation !== LIVE_TRADING_CONFIRMATION_VALUE) {
    return {
      enabled: false,
      message: `set LIVE_TRADING_CONFIRMATION="${LIVE_TRADING_CONFIRMATION_VALUE}" to confirm live trading`,
    };
  }

  return { enabled: true, message: "enabled" };
}
