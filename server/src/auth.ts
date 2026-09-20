import { Router } from 'express';
import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { z } from 'zod';
import { googleIdentity, type GoogleIdentity } from './google.js';

import { Audit, Business, Challenge, Session, User } from './models.js';
import { authenticate, clearSession, createSession, digest, email, ensure, limit, mobile, publicUser, random, rate, sha, sharedProfile, hashPassword, verifyPassword } from './security.js';
import { sendMail } from './mail.js';
export function createAuthRouter(verifyGoogle: (token: string) => Promise<GoogleIdentity> = googleIdentity) {
const auth = Router();
auth.use(rate('auth', 30));
async function issueChallenge(address: string, purpose: string, payload: any) {
  await limit(`otp:${address}`, 1, 60000);
  await limit(`otp-hour:${address}`, 8, 3600000);
  const code = crypto.randomInt(0, 1000000).toString().padStart(6, '0'), continuation = random();
  const id = new mongoose.Types.ObjectId();
  await Challenge.updateMany({ email: address, purpose, consumedAt: null }, { $set: { consumedAt: new Date() } });
  const challenge = await Challenge.create({ _id: id, email: address, purpose, digest: digest(`${id}:${purpose}:${code}`), continuationHash: sha(continuation), expiresAt: new Date(Date.now() + 5 * 60000), payload });
  if (!payload.blocked) {
    try { await sendMail(address, 'Your OkKhata verification code', `Your code is ${code}. It expires in 5 minutes. Never share this code. If you did not request it, ignore this email.`); }
    catch { await Challenge.deleteOne({ _id: id }); throw new Error('Unable to send verification email. Please try again later.'); }
  }
  return { challengeId: String(challenge._id), continuation, message: 'If eligible, a verification code has been sent. Check your email.' };
}
async function consumeChallenge(input: unknown, purpose: string) {
  const body = z.object({ challengeId: z.string().regex(/^[a-f0-9]{24}$/), continuation: z.string().length(64), code: z.string().regex(/^\d{6}$/) }).parse(input);
  const criteria = { _id: body.challengeId, purpose, continuationHash: sha(body.continuation), consumedAt: null, expiresAt: { $gt: new Date() }, attempts: { $lt: 5 } };
  const challenge = await Challenge.findOneAndUpdate(criteria, { $inc: { attempts: 1 } }, { new: true });
  ensure(challenge && !challenge.payload.blocked && challenge.digest === digest(`${body.challengeId}:${purpose}:${body.code}`), 400, 'The code is invalid or expired. Request a new code if needed.');
  const consumed = await Challenge.findOneAndUpdate({ _id: challenge._id, consumedAt: null }, { $set: { consumedAt: new Date() } }, { new: true });
  ensure(consumed, 400, 'This code has already been used.');
  return consumed;
}
// Retired endpoints cannot create accounts or bypass Google onboarding.
for (const route of ['/signup', '/signup/verify', '/login', '/password/reset', '/password/change', '/google/link']) {
  auth.post(route, (_req, res) => res.status(410).json({ error: 'Use Google to sign up, or your mobile number with an email code to sign in.' }));
}
auth.post('/challenge/resend', async (req, res) => {
  const body = z.object({ challengeId: z.string().regex(/^[a-f0-9]{24}$/), continuation: z.string().length(64) }).parse(req.body);
  const previous = await Challenge.findOne({ _id: body.challengeId, continuationHash: sha(body.continuation), createdAt: { $gt: new Date(Date.now() - 30 * 60000) } });
  ensure(previous && previous.purpose !== 'google-signup' && !previous.consumedAt, 400, 'Start a new verification request.');
  res.status(202).json(await issueChallenge(previous.email, previous.purpose, previous.payload));
});
auth.post('/otp/request', async (req, res) => {
  const body = z.object({ mobile }).strict().parse(req.body);
  await limit('mobile-login:' + body.mobile, 8, 3600000);
  const user = await User.findOne({ mobile: body.mobile, emailVerifiedAt: { $exists: true } });
  const result = await issueChallenge(user?.email || body.mobile + '@unregistered.invalid', 'login', user ? { userId: String(user._id), mobile: user.mobile } : { blocked: true });
  res.status(202).json(result);
});
auth.post('/otp/verify', async (req, res) => {
  const c = await consumeChallenge(req.body, 'login');
  const user = await User.findOne({ _id: c.payload.userId, email: c.email, mobile: c.payload.mobile }); ensure(user, 400, 'The account details changed. Request a new code.');
  await createSession(req, res, String(user._id)); res.json({ user: publicUser(user) });
});
auth.post('/google', async (req, res) => {
  const { token } = z.object({ token: z.string().min(20).max(10000) }).strict().parse(req.body);
  const identity = await verifyGoogle(token);
  let user = await User.findOne({ googleId: identity.uid });
  if (!user) {
    // A verified Google identity may securely link an existing account with the same verified email.
    user = await User.findOneAndUpdate({ email: identity.email, emailVerifiedAt: { $exists: true }, googleId: { $exists: false } }, { $set: { googleId: identity.uid } }, { new: true });
  }
  if (user) { await createSession(req, res, String(user._id)); return res.json({ user: publicUser(user) }); }
  ensure(!await User.exists({ email: identity.email }), 409, 'This email is already linked to another Google identity.');
  const continuation = random();
  const pending = await Challenge.create({ email: identity.email, purpose: 'google-signup', continuationHash: sha(continuation), expiresAt: new Date(Date.now() + 10 * 60000), payload: identity });
  res.json({ needsMobile: true, challengeId: String(pending._id), continuation, email: identity.email, name: identity.name || '' });
});
auth.post('/google/complete', async (req, res) => {
  const body = z.object({ challengeId: z.string().regex(/^[a-f0-9]{24}$/), continuation: z.string().length(64), mobile, name: z.string().trim().min(1).max(80), passcode: z.string().regex(/^\d{4,6}$/) }).strict().parse(req.body);
  const passcodeHash = await hashPassword(body.passcode);
  let user: any;
  await mongoose.connection.transaction(async session => {
    const c = await Challenge.findOneAndUpdate({ _id: body.challengeId, purpose: 'google-signup', continuationHash: sha(body.continuation), consumedAt: null, expiresAt: { $gt: new Date() } }, { $set: { consumedAt: new Date() } }, { new: true, session });
    ensure(c, 400, 'Google signup expired or was already completed. Continue with Google again.');
    ensure(!await User.exists({ $or: [{ mobile: body.mobile }, { email: c.email }, { googleId: c.payload.uid }] }).session(session), 409, 'This mobile number or Google account is already registered. Sign in or use a different number.');
    [user] = await User.create([{ name: body.name, mobile: body.mobile, email: c.email, googleId: c.payload.uid, emailVerifiedAt: new Date(), passcodeHash }], { session });
    await Business.create([{ ownerId: user._id, name: body.name, phone: body.mobile, email: c.email }], { session });
    await Audit.create([{ actorId: user._id, action: 'GOOGLE_ACCOUNT_CREATED', resourceId: String(user._id) }], { session });
  });
  await createSession(req, res, String(user._id)); res.status(201).json({ user: publicUser(user) });
});

auth.get('/session', authenticate, async (req, res) => { const user = await User.findById(req.auth!.userId); ensure(user, 401, 'Sign in again.'); res.json({ user: publicUser(user), business: req.auth!.business }); });

auth.post('/unlock', authenticate, async (req, res) => {
  const { passcode } = z.object({ passcode: z.string().regex(/^\d{4,6}$/) }).strict().parse(req.body);
  const user = await User.findById(req.auth!.userId).select('passcodeHash');
  ensure(user?.passcodeHash, 400, 'Passcode not set for this account.');
  const ok = await verifyPassword(user.passcodeHash, passcode);
  ensure(ok, 400, 'Incorrect passcode. Try again.');
  res.json({ ok: true });
});
auth.post('/passcode/change', authenticate, async (req, res) => {
  const { oldPasscode, newPasscode } = z.object({ oldPasscode: z.string().regex(/^\d{4,6}$/), newPasscode: z.string().regex(/^\d{4,6}$/) }).strict().parse(req.body);
  const user = await User.findById(req.auth!.userId).select('passcodeHash');
  ensure(user?.passcodeHash, 400, 'Passcode not set for this account.');
  ensure(await verifyPassword(user.passcodeHash, oldPasscode), 400, 'Incorrect old passcode.');
  const passcodeHash = await hashPassword(newPasscode);
  await User.updateOne({ _id: req.auth!.userId }, { $set: { passcodeHash } });
  res.json({ ok: true });
});
auth.post('/passcode/forgot-request', authenticate, async (req, res) => {
  const user = await User.findById(req.auth!.userId).select('email');
  ensure(user?.email, 400, 'No email linked to this account.');
  const result = await issueChallenge(user.email, 'passcode-reset', { userId: String(user._id) });
  res.status(202).json(result);
});
auth.post('/passcode/forgot-verify', authenticate, async (req, res) => {
  const body = z.object({ challengeId: z.string(), continuation: z.string(), code: z.string(), newPasscode: z.string().regex(/^\d{4,6}$/) }).parse(req.body);
  const c = await consumeChallenge(body, 'passcode-reset');
  ensure(String(c.payload.userId) === String(req.auth!.userId), 403, 'Invalid request.');
  const passcodeHash = await hashPassword(body.newPasscode);
  await User.updateOne({ _id: req.auth!.userId }, { $set: { passcodeHash } });
  res.json({ ok: true });
});
auth.get('/shared-profile', authenticate, async (req, res) => { const user = await User.findById(req.auth!.userId); ensure(user, 401, 'Sign in again.'); res.json({ profile: sharedProfile(user) }); });
auth.post('/logout', authenticate, async (req, res) => { await Session.deleteOne({ _id: req.auth!.session._id }); clearSession(res); res.json({ ok: true }); });
auth.get('/devices', authenticate, async (req, res) => {
  const sessions = await Session.find({ userId: req.auth!.userId, expiresAt: { $gt: new Date() } }).select('device lastSeen createdAt');
  res.json(sessions.map(s => ({ ...s.toObject(), current: String(s._id) === String(req.auth!.session._id) })));
});
auth.delete('/devices/:id', authenticate, async (req, res) => {
  ensure(mongoose.isValidObjectId(req.params.id), 400, 'Invalid session.');
  await Session.deleteOne({ _id: req.params.id, userId: req.auth!.userId });
  if (String(req.params.id) === String(req.auth!.session._id)) clearSession(res);
  res.json({ ok: true });
});
auth.post('/devices/revoke-others', authenticate, async (req, res) => { await Session.deleteMany({ userId: req.auth!.userId, _id: { $ne: req.auth!.session._id } }); res.json({ ok: true }); });
function checkContactLimit(user: any, kind: string) {
  ensure(!user.lastContactChangeAt || Date.now() - new Date(user.lastContactChangeAt).getTime() >= 7 * 86400000, 429, 'Wait 7 days after your last email or mobile change.');
  const changes = (user.contactChanges || []).filter((c: any) => c.kind === kind && new Date(c.at).getTime() > Date.now() - 365 * 86400000);
  ensure(changes.length < (kind === 'email' ? 2 : 1), 429, kind === 'email' ? 'Email can be changed twice in any 365-day period.' : 'Mobile can be changed once in any 365-day period.');
}
auth.post('/profile-change/request', authenticate, async (req, res) => {
  const body = z.object({ kind: z.enum(['email', 'mobile']), value: z.string() }).strict().parse(req.body);
  const user = await User.findById(req.auth!.userId); ensure(user, 401, 'Sign in again.');
  checkContactLimit(user, body.kind);
  const value = body.kind === 'email' ? email.parse(body.value) : mobile.parse(body.value);
  ensure(user[body.kind] !== value, 400, 'Enter a different contact detail.');
  ensure(!await User.exists({ [body.kind]: value }), 409, 'This contact detail is already registered.');
  res.json(await issueChallenge(user.email, 'profile-change', { userId: String(user._id), kind: body.kind, value, oldEmail: user.email, oldMobile: user.mobile }));
});
auth.post('/profile-change/verify', authenticate, async (req, res) => {
  const purpose = req.body.stage === 'new-email' ? 'profile-change-new-email' : 'profile-change';
  const c = await consumeChallenge(req.body, purpose); ensure(c.payload.userId === req.auth!.userId, 403, 'This request is not yours.');
  const before = await User.findById(req.auth!.userId); ensure(before && before.email === c.payload.oldEmail && before.mobile === c.payload.oldMobile, 409, 'Contact details changed. Start again.');
  checkContactLimit(before, c.payload.kind);
  if (c.payload.kind === 'email' && purpose === 'profile-change') {
    return res.json({ ...await issueChallenge(c.payload.value, 'profile-change-new-email', c.payload), stage: 'new-email', needsNewEmail: true });
  }
  let user: any;
  await mongoose.connection.transaction(async session => {
    user = await User.findById(req.auth!.userId).session(session); ensure(user && user.email === c.payload.oldEmail && user.mobile === c.payload.oldMobile, 409, 'Contact details changed. Start again.');
    checkContactLimit(user, c.payload.kind);
    user[c.payload.kind] = c.payload.value; user.lastContactChangeAt = new Date();
    user.contactChanges.push({ kind: c.payload.kind, at: user.lastContactChangeAt });
    await user.save({ session });
    await Session.deleteMany({ userId: user._id, _id: { $ne: req.auth!.session._id } }, { session });
    await Audit.create([{ actorId: user._id, action: 'CONTACT_CHANGED', detail: c.payload.kind }], { session });
  });
  res.json({ user: publicUser(user) });
  void sendMail(c.payload.oldEmail, 'Your OkKhata contact details changed', 'Your ' + c.payload.kind + ' was updated. Other device sessions were signed out.').catch(() => {});
});

auth.post('/profile-edit/request', authenticate, async (req, res) => {
  const body = z.object({ name: z.string().trim().min(1).max(80) }).strict().parse(req.body);
  const user = await User.findById(req.auth!.userId); ensure(user?.emailVerifiedAt, 403, 'Verify your email before editing your profile.');
  res.status(202).json(await issueChallenge(user.email, 'profile-edit', { userId: String(user._id), name: body.name }));
});
auth.post('/profile-edit/verify', authenticate, async (req, res) => {
  const c = await consumeChallenge(req.body, 'profile-edit'); ensure(c.payload.userId === req.auth!.userId, 403, 'This request is not yours.');
  const user = await User.findByIdAndUpdate(req.auth!.userId, { $set: { name: c.payload.name } }, { new: true }); ensure(user, 401, 'Sign in again.');
  await Audit.create({ actorId: user._id, action: 'PROFILE_EDITED', resourceId: String(user._id) });
  res.json({ user: publicUser(user) });
});
return auth;
}
