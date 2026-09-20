import crypto from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import argon2 from 'argon2';
import { z } from 'zod';
import { Business, RateBucket, Session, User } from './models.js';
import { config } from './config.js';
declare global { namespace Express { interface Request { auth?: { userId: string; session: any; business: any; features: Record<string, boolean>; accountMode: 'personal' | 'business' } } } }
export class HttpError extends Error { constructor(public status: number, message: string) { super(message); } }
export function ensure(value: unknown, status: number, message: string): asserts value { if (!value) throw new HttpError(status, message); }
export const sha = (value: string) => crypto.createHash('sha256').update(value).digest('hex');
export const random = () => crypto.randomBytes(32).toString('hex');
export const digest = (value: string) => crypto.createHmac('sha256', config.otpSecret).update(value).digest('hex');
export const password = z.string().min(12, 'Use at least 12 characters.').max(128).refine(v => !['password1234', '123456789012', 'qwerty123456'].includes(v.toLowerCase()), 'Choose a less predictable password.');
export const email = z.string().trim().toLowerCase().email().max(254);
export const mobile = z.string().trim().transform(v => v.replace(/[\s()-]/g, '')).transform(v => /^[6-9]\d{9}$/.test(v) ? `+91${v}` : /^91[6-9]\d{9}$/.test(v) ? `+${v}` : v).refine(v => /^\+91[6-9]\d{9}$/.test(v), 'Enter a valid Indian mobile number (+91 and 10 digits).');
export const objectId = z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid record ID.');
export const hashPassword = (value: string) => argon2.hash(value, { type: argon2.argon2id, memoryCost: 65536, timeCost: 3, parallelism: 1 });
export const verifyPassword = async (hash: string, value: string) => { try { return await argon2.verify(hash, value); } catch { return false; } };
const cookieOpts = { httpOnly: true, secure: config.production, sameSite: (config.production ? 'none' : 'lax') as 'none' | 'lax', path: '/' };
export const sessionCookie = config.production ? '__Host-okkhata' : 'okkhata_session';
export async function createSession(req: Request, res: Response, userId: string) {
  const token = random(), csrf = random();
  // Rotating this browser's session does not revoke other devices.
  if (req.cookies[sessionCookie]) await Session.deleteOne({ tokenHash: sha(req.cookies[sessionCookie]) });
  await Session.create({ userId, tokenHash: sha(token), csrfHash: sha(csrf), device: String(req.headers['user-agent'] || 'Unknown browser').slice(0, 250), lastSeen: new Date(), authenticatedAt: new Date(), expiresAt: new Date(Date.now() + 30 * 86400000) });
  res.cookie(sessionCookie, token, { ...cookieOpts, maxAge: 30 * 86400000 });
  res.cookie('okkhata_csrf', csrf, { ...cookieOpts, httpOnly: false, maxAge: 30 * 86400000 });
  res.set('X-CSRF-Token', csrf);
}
export function clearSession(res: Response) { res.clearCookie(sessionCookie, cookieOpts); res.clearCookie('okkhata_csrf', { ...cookieOpts, httpOnly: false }); }
export function sameOrigin(req: Request, _res: Response, next: NextFunction) {
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    const origin = req.headers.origin;
    const isLocalDev = !config.production && (['http://localhost:5173', 'http://127.0.0.1:5173'].includes(origin || '') || /^http:\/\/(?:[0-9]{1,3}\.){3}[0-9]{1,3}:\d+$/.test(origin || ''));
    const developmentLoopback = isLocalDev && ['http://localhost:5173', 'http://127.0.0.1:5173'].includes(config.origin);
    ensure(origin === config.origin || developmentLoopback, 403, 'This request origin is not allowed.');
  }
  next();
}
export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  const token = req.cookies[sessionCookie];
  ensure(typeof token === 'string', 401, 'Please sign in to continue.');
  const session = await Session.findOne({ tokenHash: sha(token), expiresAt: { $gt: new Date() }, lastSeen: { $gt: new Date(Date.now() - 7 * 86400000) } });
  ensure(session, 401, 'Your session expired. Please sign in again.');
  if (!['GET', 'HEAD'].includes(req.method)) ensure(sha(String(req.headers['x-csrf-token'] || '')) === session.csrfHash, 403, 'Refresh the page and try again.');
  const [business, user] = await Promise.all([Business.findOne({ ownerId: session.userId }), User.findById(session.userId).select('featureToggles accountMode')]);
  ensure(business, 403, 'No business is available for this account.');
  ensure(user, 401, 'Your account is no longer available.');
  req.auth = { userId: String(session.userId), session, business, features: { customers: true, transactions: true, bills: false, inventory: false, reports: false, notifications: false, ...(user.featureToggles || {}) }, accountMode: user.accountMode || 'personal' };
  await Session.updateOne({ _id: session._id }, { $set: { lastSeen: new Date() } });
  next();
}
export async function limit(key: string, max: number, windowMs: number) {
  const slot = Math.floor(Date.now() / windowMs);
  const bucket = await RateBucket.findOneAndUpdate({ key: digest(`${key}:${slot}`) }, { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date((slot + 2) * windowMs) } }, { upsert: true, new: true });
  ensure(bucket.count <= max, 429, 'Too many attempts. Please wait and try again.');
}
export const rate = (label: string, max = 30, ms = 60000) => async (req: Request, _res: Response, next: NextFunction) => { await limit(`${label}:${req.ip}`, max, ms); next(); };
export const requireFeature = (name: string) => (req: Request, _res: Response, next: NextFunction) => { ensure(req.auth?.features?.[name], 403, 'Turn this feature on in Settings before using it.'); next(); };
export const publicUser = (u: any) => ({ id: String(u._id), name: u.name, email: u.email, mobile: u.mobile, emailVerified: !!u.emailVerifiedAt, photo: u.photo?.url, theme: u.theme, mode: u.mode, customColor: u.customColor, fontFamily: u.fontFamily || 'dm-sans', fontScale: Math.max(1.25, u.fontScale || 1.25), contactChanges: u.contactChanges || [], lastContactChangeAt: u.lastContactChangeAt, language: u.language || 'en', accountMode: u.accountMode || 'personal', showContactDetails: !!u.showContactDetails, featureToggles: { customers: true, transactions: true, bills: false, inventory: false, reports: false, notifications: false, ...(u.featureToggles || {}) }, googleLinked: !!u.googleId });
export const sharedProfile = (u: any) => ({ id: String(u._id), name: u.name, photo: u.photo?.url, accountMode: u.accountMode || 'personal', ...(u.accountMode === 'business' && u.showContactDetails ? { email: u.email, mobile: u.mobile } : {}) });
