import axios from 'axios';

export async function scanToken(tokenAddress: string): Promise<boolean> {
  try {
    const res = await axios.get(`https://public-api.birdeye.so/public/token/${tokenAddress}`, {
      headers: { 'x-api-key': 'YOUR_BIRDEYE_API_KEY' }
    });

    const token = res.data.data;
    if (!token) return false;

    const lowLP = token.liquidity < 5000;
    const lowVol = token.volume24h < 20000;

    return !(lowLP || lowVol);
  } catch (err) {
    console.error('Token risk scan failed:', err.message);
    return false;
  }
}
