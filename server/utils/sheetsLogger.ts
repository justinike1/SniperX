import { google } from 'googleapis';
import * as fs from 'fs';
import * as path from 'path';

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_ID || '1kdlXUEErNutCnqu7BuLxNBAmNftM2czKkMOBlHz5vaw';

let sheetsService: any = null;

function initializeSheets() {
  try {
    const credentialsPath = path.join(process.cwd(), 'attached_assets/google-creds.json');
    
    if (fs.existsSync(credentialsPath)) {
      const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
      
      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
      });
      
      sheetsService = google.sheets({ version: 'v4', auth });
      console.log('📊 Google Sheets logger initialized');
    } else {
      console.log('[Sheets] Credentials file not found, logging disabled');
    }
  } catch (error) {
    console.error('[Sheets Error] Failed to initialize:', error);
  }
}

initializeSheets();

export async function logToSheets(
  action: string, 
  tokenMint: string, 
  amount: string | number, 
  txid: string
): Promise<void> {
  try {
    if (!sheetsService) {
      console.log('[Sheets] Service not initialized, skipping log');
      return;
    }

    const timestamp = new Date().toISOString();
    const row = [
      timestamp,
      action,
      tokenMint,
      amount.toString(),
      txid,
      `https://solscan.io/tx/${txid}`
    ];

    await sheetsService.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Trading!A:F',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [row]
      }
    });

    console.log(`[SNIPERX] 📊 Trade logged to Google Sheets`);
  } catch (error) {
    console.error('[Sheets Error]', error);
  }
}

export async function logPnLToSheets(pnlData: any): Promise<void> {
  try {
    if (!sheetsService) {
      console.log('[Sheets] Service not initialized, skipping PnL log');
      return;
    }

    const timestamp = new Date().toISOString();
    const row = [
      timestamp,
      pnlData.totalTrades,
      pnlData.winRate,
      pnlData.totalPnL,
      pnlData.todayPnL,
      pnlData.bestTrade,
      pnlData.worstTrade
    ];

    await sheetsService.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'PnL!A:G',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [row]
      }
    });

    console.log(`[SNIPERX] 📊 PnL data logged to Google Sheets`);
  } catch (error) {
    console.error('[Sheets PnL Error]', error);
  }
}