import nodemailer from 'nodemailer';
import fs from 'node:fs/promises';
import path from 'node:path';
import { random } from './security.js';
import { config } from './config.js';
export async function sendMail(to: string, subject: string, text: string) {
  if (config.localMailDir) {
    await fs.mkdir(config.localMailDir, { recursive: true });
    await fs.writeFile(path.join(config.localMailDir, `${Date.now()}-${random().slice(0, 8)}.json`), JSON.stringify({ to, subject, text }, null, 2), { mode: 0o600 });
    return;
  }
  if (!process.env.SMTP_HOST) throw new Error('Email service is not configured.');
  const transport = nodemailer.createTransport({ host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 587), secure: process.env.SMTP_PORT === '465', auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined });
  await transport.sendMail({ from: process.env.SMTP_FROM, to, subject, text });
}
