import axios from 'axios';
import { config } from './config';

export async function executeJupiterTrade(fromMint: string, toMint: string, amount: number) {
  try {
    const quoteUrl = \`https://quote-api.jup.ag/v6/quote?inputMint=\${fromMint}&outputMint=\${toMint}&amount=\${amount}&slippage=\${config.slippage}\`;

    const { data: quote } = await axios.get(quoteUrl);
    if (!quote.routes || quote.routes.length === 0) {
      console.log('❌ No Jupiter routes found');
      return;
    }

    const bestRoute = quote.routes[0];
    console.log('🛣️ Best Route:', bestRoute);

    // Normally you'd sign & send the tx with Phantom keypair here

    return {
      success: true,
      route: bestRoute,
      expectedOut: bestRoute.outAmount / Math.pow(10, bestRoute.outDecimals)
    };
  } catch (err) {
    console.error('🔥 Jupiter error:', err.message);
    return { success: false };
  }
}
