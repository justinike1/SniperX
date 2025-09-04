import { google } from 'googleapis';
import { JWT } from 'google-auth-library';

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

const jwtClient = new JWT({
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  scopes: SCOPES,
});

const sheets = google.sheets({ version: 'v4', auth: jwtClient });

export async function logToSheets(
  action: string, 
  tokenMint: string, 
  amount: string | number, 
  txid: string
): Promise<void> {
  try {
    if (!process.env.GOOGLE_SHEET_ID || !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
      console.log('[Sheets] Missing configuration, skipping log');
      return;
    }

    const values = [[
      new Date().toLocaleString(),
      action,
      tokenMint,
      amount.toString(),
      txid,
      `https://solscan.io/tx/${txid}`
    ]];

    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: 'Sheet1!A:F',
      valueInputOption: 'RAW',
      requestBody: { values },
    });

    console.log('📊 Trade logged to Google Sheets');
  } catch (error) {
    console.error('[Sheets Error]', error);
  }
}

export async function logPnLToSheets(pnlData: any): Promise<void> {
  try {
    if (!process.env.GOOGLE_SHEET_ID || !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
      return;
    }

    const timestamp = new Date().toISOString();
    const summary = [
      timestamp,
      'PnL_SUMMARY',
      pnlData.totalTrades || 0,
      pnlData.successfulTrades || 0,
      pnlData.totalProfit || 0,
      pnlData.totalLoss || 0,
      pnlData.winRate || 0
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: 'PnL!A:G',
      valueInputOption: 'RAW',
      requestBody: {
        values: [summary]
      }
    });

    console.log('📊 PnL summary logged to Google Sheets');
  } catch (error) {
    console.error('[Sheets PnL Error]', error);
  }
}

export async function initializeSheets(): Promise<void> {
  try {
    if (!process.env.GOOGLE_SHEET_ID || !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
      console.log('[Sheets] Configuration missing, logger disabled');
      return;
    }

    await jwtClient.authorize();
    console.log('✅ Google Sheets logger ready');
  } catch (error) {
    console.error('[Sheets Init Error]', error);
  }
}

initializeSheets();