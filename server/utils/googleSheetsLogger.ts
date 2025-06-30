import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';

// Replace with your actual Google Sheets ID
const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID';
const RANGE = 'Trades!A:I'; // Adjust range as needed

interface TradeData {
  timestamp: string;
  type: 'BUY' | 'SELL';
  symbol: string;
  tokenAddress: string;
  amount: number;
  price: number;
  txHash?: string;
  pnl?: number;
  pnlPercentage?: number;
}

let sheetsClient: any = null;

async function initializeSheetsClient() {
  try {
    const credentialsPath = path.join(process.cwd(), 'credentials.json');
    
    if (!fs.existsSync(credentialsPath)) {
      console.log('⚠️ Google Sheets credentials.json not found - skipping sheets logging');
      return null;
    }

    const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
    
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const authClient = await auth.getClient();
    sheetsClient = google.sheets({ version: 'v4', auth: authClient as any });
    
    console.log('✅ Google Sheets client initialized successfully');
    return sheetsClient;
  } catch (error) {
    console.error('❌ Failed to initialize Google Sheets client:', error);
    return null;
  }
}

export async function logTradeToSheet(tradeData: TradeData): Promise<void> {
  try {
    if (!sheetsClient) {
      sheetsClient = await initializeSheetsClient();
    }

    if (!sheetsClient) {
      console.log('⚠️ Google Sheets not available - trade logged locally only');
      return;
    }

    if (SPREADSHEET_ID === 'YOUR_SPREADSHEET_ID') {
      console.log('⚠️ Please replace YOUR_SPREADSHEET_ID in googleSheetsLogger.ts');
      return;
    }

    const values = [
      [
        tradeData.timestamp,
        tradeData.type,
        tradeData.symbol,
        tradeData.tokenAddress,
        tradeData.amount,
        tradeData.price,
        tradeData.txHash || '',
        tradeData.pnl || '',
        tradeData.pnlPercentage || ''
      ]
    ];

    const request = {
      spreadsheetId: SPREADSHEET_ID,
      range: RANGE,
      valueInputOption: 'USER_ENTERED',
      resource: {
        values,
      },
    };

    await sheetsClient.spreadsheets.values.append(request);
    console.log(`📊 Trade logged to Google Sheets: ${tradeData.type} ${tradeData.symbol}`);
    
  } catch (error) {
    console.error('❌ Failed to log trade to Google Sheets:', error);
    // Don't throw error to avoid breaking trade execution
  }
}

export async function createSheetsHeader(): Promise<void> {
  try {
    if (!sheetsClient) {
      sheetsClient = await initializeSheetsClient();
    }

    if (!sheetsClient || SPREADSHEET_ID === 'YOUR_SPREADSHEET_ID') {
      return;
    }

    const headerValues = [
      [
        'Timestamp',
        'Type',
        'Symbol',
        'Token Address',
        'Amount (SOL)',
        'Price',
        'Transaction Hash',
        'P&L (SOL)',
        'P&L (%)'
      ]
    ];

    const request = {
      spreadsheetId: SPREADSHEET_ID,
      range: 'Trades!A1:I1',
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: headerValues,
      },
    };

    await sheetsClient.spreadsheets.values.update(request);
    console.log('📊 Google Sheets header created successfully');
    
  } catch (error) {
    console.error('❌ Failed to create sheets header:', error);
  }
}

// Initialize on module load
initializeSheetsClient();