import { runAutoTrader } from './autoTrader';

async function loop() {
  console.log('🔁 SniperX Auto Loop Started');
  setInterval(async () => {
    await runAutoTrader();
  }, 1000 * 60 * 5); // Every 5 minutes
}

loop();
