import axios from 'axios';
import { config } from './config';

export async function explainTrade(symbol: string, reason: string): Promise<string> {
  try {
    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-4',
      messages: [
        { role: 'system', content: 'You are a crypto trading analyst.' },
        { role: 'user', content: `Explain why we are buying ${symbol}. The reasoning: ${reason}` }
      ]
    }, {
      headers: {
        'Authorization': `Bearer ${config.openaiApiKey}`,
        'Content-Type': 'application/json'
      }
    });

    return response.data.choices[0].message.content.trim();
  } catch (error) {
    console.error('AI explanation failed:', error.message);
    return `Trade reason: ${reason}`;
  }
}
