import dotenv from 'dotenv';
import path from 'node:path';
dotenv.config({ path: path.resolve(process.cwd(), process.cwd().endsWith('server') ? '../.env' : '.env'), quiet: true });
export const config = {
  production: process.env.NODE_ENV === 'production',
  port: Number(process.env.PORT || 4000),
  host: process.env.HOST || (process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1'),
  origin: process.env.APP_ORIGIN || 'http://localhost:5173',
  mongo: process.env.MONGODB_URI || '',
  otpSecret: process.env.OTP_SECRET || '',
  localMailDir: process.env.NODE_ENV !== 'production' ? process.env.LOCAL_MAIL_DIR : undefined,
};
export function checkConfig() {
  if (!config.mongo || config.otpSecret.length < 32) throw new Error('Configure MONGODB_URI and an OTP_SECRET of at least 32 characters. See .env.example or use npm run dev:local.');
  if (config.production && (!config.origin.startsWith('https://') || !process.env.SMTP_HOST)) throw new Error('Production requires HTTPS APP_ORIGIN and SMTP configuration.');
}
