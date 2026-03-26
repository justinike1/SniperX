import { tradeQueue, type TradeTask } from "./queue";
import { pythPriceService } from "../services/pythPriceFeed";
import { sendTelegramAlert } from "../utils/telegramBotEnhanced";
import { livePositionManager, portfolioManager } from "../brain/index";

const TOKEN_MINTS: Record<string, string> = {
  SOL: "So11111111111111111111111111111111111111112",
  BONK: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
  JUP: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",
  USDC: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
};

async function buyHandler(task: TradeTask): Promise<void> {
  console.log(`🔵 Processing BUY: ${task.amount} ${task.denom} of ${task.token}`);

  try {
    const tokenMint = TOKEN_MINTS[task.token] || task.token;

    const pythPrice = await pythPriceService.getPrice(task.token);
    const price = pythPrice?.price || 0;

    let solAmount = 0;

    if (task.denom === "USD" && price > 0) {
      const solPrice = await pythPriceService.getPrice("SOL");
      if (solPrice) {
        solAmount = task.amount / solPrice.price;
      }
    } else if (task.denom === "SOL") {
      solAmount = task.amount;
    } else if (task.denom === "TOKEN" && price > 0) {
      const usdValue = task.amount * price;
      const solPrice = await pythPriceService.getPrice("SOL");
      if (solPrice) {
        solAmount = usdValue / solPrice.price;
      }
    }

    if (solAmount === 0) {
      throw new Error("Unable to calculate trade size");
    }

    const backendUrl = process.env.BACKEND_URL || "http://localhost:5000";
    const response = await fetch(`${backendUrl}/api/pro/trade`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        signals: [{
          strategy: "TELEGRAM",
          tokenMint,
          action: "BUY",
          confidence: 0.8,
          reason: `Telegram buy: ${task.amount} ${task.denom}`,
          sizeHintPct: solAmount / 1.0
        }],
        tokenMint,
        action: "BUY",
        confidence: 0.8
      })
    });

    const result = await response.json();

    if (result.success && result.decision === "BUY") {
      task.result = result;
      await sendTelegramAlert(
        `✅ *BUY EXECUTED*\n\n` +
        `Token: ${task.token}\n` +
        `Amount: ${result.sizeSOL.toFixed(4)} SOL\n` +
        `Price: $${price.toFixed(6)}\n` +
        `Reason: ${result.reason}`
      );
    } else {
      throw new Error(`Trade rejected: ${result.reason || "Risk limits"}`);
    }

  } catch (error) {
    console.error("❌ Buy handler error:", error);
    await sendTelegramAlert(
      `❌ *BUY FAILED*\n\n` +
      `Token: ${task.token}\n` +
      `Error: ${error instanceof Error ? error.message : "Unknown"}`
    );
    throw error;
  }
}

async function sellHandler(task: TradeTask): Promise<void> {
  console.log(`🔴 Processing SELL: ${task.amount} ${task.denom} of ${task.token}`);

  try {
    const tokenMint = TOKEN_MINTS[task.token] || task.token;

    const snapshot = await portfolioManager.refreshSnapshot();
    const open = snapshot.openPositions.find((p) => p.mint === tokenMint);
    if (!open) {
      throw new Error(`No tracked open position for ${task.token}`);
    }

    let fraction = 1;
    if (task.amount > 0) {
      if (task.denom === "TOKEN") {
        fraction = task.amount / open.quantity;
      } else if (task.denom === "USD") {
        fraction = task.amount / Math.max(0.000001, open.markValueUSD);
      } else {
        fraction = 1;
      }
    }
    fraction = Math.max(0.01, Math.min(1, fraction));

    const sell = await livePositionManager.forceSellByMint(
      tokenMint,
      fraction,
      fraction >= 0.999 ? "TELEGRAM_SELL_FULL" : "TELEGRAM_SELL_PARTIAL"
    );
    if (!sell.success) {
      throw new Error(sell.reason || "SELL_FAILED");
    }

    task.result = sell;
    await sendTelegramAlert(
      `✅ *SELL EXECUTED*\n\n` +
        `Token: ${task.token}\n` +
        `Fraction: ${(fraction * 100).toFixed(1)}%\n` +
        `Realized: ${sell.realizedPnlUSD !== undefined ? `${sell.realizedPnlUSD >= 0 ? "+" : ""}$${sell.realizedPnlUSD.toFixed(2)}` : "n/a"}\n` +
        `Tx: ${sell.txHash || "n/a"}`
    );
  } catch (error) {
    console.error("❌ Sell handler error:", error);
    await sendTelegramAlert(
      `❌ *SELL FAILED*\n\n` +
      `Token: ${task.token}\n` +
      `Error: ${error instanceof Error ? error.message : "Unknown"}`
    );
    throw error;
  }
}

export function registerTradeHandlers() {
  tradeQueue.registerHandler("BUY", buyHandler);
  tradeQueue.registerHandler("SELL", sellHandler);
  console.log("✅ Trade handlers registered");

  tradeQueue.on("task:completed", (task) => {
    console.log(`✅ Task completed: ${task.id}`);
  });

  tradeQueue.on("task:failed", (task) => {
    console.error(`❌ Task failed: ${task.id} - ${task.error}`);
  });
}
