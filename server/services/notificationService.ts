import twilio from 'twilio';

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || '';
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || '';
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER || '';

export class NotificationService {
  private twilioClient: twilio.Twilio | null = null;

  constructor() {
    if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN) {
      this.twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
    } else {
      console.warn('Twilio credentials not configured. SMS notifications disabled.');
    }
  }

  async sendSMS(to: string, message: string): Promise<boolean> {
    if (!this.twilioClient || !TWILIO_PHONE_NUMBER) {
      console.log(`SMS (simulated) to ${to}: ${message}`);
      return true; // Simulate success for demo
    }

    try {
      const result = await this.twilioClient.messages.create({
        body: message,
        from: TWILIO_PHONE_NUMBER,
        to: to,
      });
      
      console.log(`SMS sent successfully: ${result.sid}`);
      return true;
    } catch (error) {
      console.error('Failed to send SMS:', error);
      return false;
    }
  }

  async sendWhatsApp(to: string, message: string): Promise<boolean> {
    if (!this.twilioClient || !TWILIO_PHONE_NUMBER) {
      console.log(`WhatsApp (simulated) to ${to}: ${message}`);
      return true; // Simulate success for demo
    }

    try {
      const result = await this.twilioClient.messages.create({
        body: message,
        from: `whatsapp:${TWILIO_PHONE_NUMBER}`,
        to: `whatsapp:${to}`,
      });
      
      console.log(`WhatsApp sent successfully: ${result.sid}`);
      return true;
    } catch (error) {
      console.error('Failed to send WhatsApp:', error);
      return false;
    }
  }

  async sendTradeAlert(phoneNumber: string, trade: any): Promise<boolean> {
    const message = `🎯 SniperX Alert: ${trade.type} ${trade.tokenSymbol} for ${trade.amount} SOL. Status: ${trade.status}`;
    return await this.sendSMS(phoneNumber, message);
  }

  async sendProfitAlert(phoneNumber: string, trade: any): Promise<boolean> {
    const profitEmoji = parseFloat(trade.profitPercentage) > 0 ? '🚀' : '📉';
    const message = `${profitEmoji} SniperX: ${trade.tokenSymbol} ${trade.profitPercentage}% (${trade.profitLoss} SOL)`;
    return await this.sendSMS(phoneNumber, message);
  }

  async sendErrorAlert(phoneNumber: string, error: string): Promise<boolean> {
    const message = `⚠️ SniperX Error: ${error}`;
    return await this.sendSMS(phoneNumber, message);
  }
}

export const notificationService = new NotificationService();
