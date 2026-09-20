import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs/promises';
import mongoose from 'mongoose';
import supertest from 'supertest';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
const local = path.resolve(process.cwd(), '../.local');
process.env.NODE_ENV = 'test';
process.env.OTP_SECRET = crypto.randomBytes(48).toString('hex');
process.env.LOCAL_MAIL_DIR = path.join(local, 'test-mail');
process.env.APP_ORIGIN = 'http://localhost:5173';
const { createApp } = await import('../src/app.js');
const { models, User, Business, Customer, Entry, Session, Challenge, RateBucket, Product, Bill } = await import('../src/models.js');
const { hashPassword } = await import('../src/security.js');
const identities = new Map<string, { uid: string; email: string; name: string }>();
const app = createApp({ verifyGoogle: async token => { const identity = identities.get(token); if (!identity) { const { HttpError } = await import('../src/security.js'); throw new HttpError(401, 'Invalid Google identity.'); } return identity; } });
function googleToken(email: string, uid = email) { const token = crypto.randomBytes(24).toString('hex'); identities.set(token, { uid, email, name: 'Google User' }); return token; }
let mongo: MongoMemoryReplSet, passwordHash: string, sequence = 0;
const password = 'A-strong-test-password!26';
const origin = 'http://localhost:5173';
const getCsrf = (res: any) => (res.headers['set-cookie'] as string[]).find(s => s.startsWith('okkhata_csrf='))!.split(';')[0]!.split('=')[1]!;
before(async () => {
  mongo = await MongoMemoryReplSet.create({ replSet: { count: 1 }, binary: { downloadDir: path.join(local, 'mongo-binaries') } });
  await mongoose.connect(mongo.getUri('okkhata-tests')); await Promise.all(models.map(m => m.init())); passwordHash = await hashPassword(password);
});
beforeEach(async () => { await RateBucket.deleteMany({}); });
after(async () => { await mongoose.disconnect(); await mongo?.stop(); });
async function owner() {
  const n = ++sequence, email = `test-${n}@example.test`;
  const u = await User.create({ name: `Test ${n}`, email, mobile: `+91990000${String(n).padStart(4, '0')}`, passwordHash, emailVerifiedAt: new Date() });
  const b = await Business.create({ ownerId: u._id, name: `Business ${n}` });
  const agent = supertest.agent(app), result = await agent.post('/api/v1/auth/google').set('Origin', origin).send({ token: googleToken(email) });
  assert.equal(result.status, 200, JSON.stringify(result.body));
  const csrf = getCsrf(result);
  return { u, b, agent, csrf, send: (method: 'post' | 'patch' | 'delete', url: string, body: any = {}) => agent[method](`/api/v1${url}`).set('Origin', origin).set('X-CSRF-Token', csrf).send(body) };
}
async function codeFor(email: string) {
  const files = await fs.readdir(process.env.LOCAL_MAIL_DIR!);
  for (const file of files.sort().reverse()) { const mail = JSON.parse(await fs.readFile(path.join(process.env.LOCAL_MAIL_DIR!, file), 'utf8')); if (mail.to === email && /code is (\d{6})/.test(mail.text)) return mail.text.match(/code is (\d{6})/)[1]; }
  throw new Error('Test email not found.');
}
test('only verified Google onboarding creates accounts, mobile is unique, completion cannot replay', async () => {
  const agent = supertest.agent(app), email = 'signup-flow@example.test';
  assert.equal((await agent.post('/api/v1/auth/signup').set('Origin', origin).send({ email })).status, 410);
  assert.equal((await agent.post('/api/v1/auth/google').set('Origin', origin).send({ token: 'invalid-token-at-least-20-chars' })).status, 401);
  const pending = await agent.post('/api/v1/auth/google').set('Origin', origin).send({ token: googleToken(email) });
  assert.equal(pending.status, 200); assert.equal(pending.body.needsMobile, true);
  assert.equal((await agent.get('/api/v1/workspace')).status, 401); assert.equal(await User.countDocuments({ email }), 0);
  const input = { challengeId: pending.body.challengeId, continuation: pending.body.continuation, name: 'Signup Test', mobile: '9899999999' };
  assert.equal((await agent.post('/api/v1/auth/google/complete').set('Origin', origin).send({ ...input, mobile: '+14155552671' })).status, 400);
  const verified = await agent.post('/api/v1/auth/google/complete').set('Origin', origin).send(input);
  assert.equal(verified.status, 201, JSON.stringify(verified.body)); assert.equal(verified.body.user.mobile, '+919899999999');
  assert.equal(verified.body.user.email, email); assert.equal(verified.body.user.fontScale, 1.25);
  assert.equal((await agent.post('/api/v1/auth/google/complete').set('Origin', origin).send(input)).status, 400);
  const another = await agent.post('/api/v1/auth/google').set('Origin', origin).send({ token: googleToken('another-google@example.test') });
  assert.equal((await agent.post('/api/v1/auth/google/complete').set('Origin', origin).send({ ...input, challengeId: another.body.challengeId, continuation: another.body.continuation })).status, 409);
  assert.equal(await User.countDocuments({ email }), 1);
});

test('owner isolation rejects cross-business reads, updates, entries, and mass assignment', async () => {
  const a = await owner(), b = await owner();
  const c = await a.send('post', '/customers', { name: 'Private customer' }); assert.equal(c.status, 201);
  assert.equal((await b.agent.get(`/api/v1/customers/${c.body._id}/entries`)).status, 404);
  assert.equal((await b.send('patch', `/customers/${c.body._id}`, { name: 'Attacker' })).status, 404);
  assert.equal((await b.send('post', '/entries', { customerId: c.body._id, kind: 'given', amount: 5000, idempotencyKey: crypto.randomUUID() })).status, 404);
  assert.equal((await a.send('patch', `/customers/${c.body._id}`, { balance: 999999 })).status, 400);
  assert.equal((await a.send('patch', '/profile', { role: 'admin' })).status, 400);
  const result = await b.agent.get('/api/v1/workspace'); assert.equal(result.body.customers.length, 0);
});
test('CSRF, origin validation, and session authorization protect mutations', async () => {
  const a = await owner();
  assert.equal((await a.agent.post('/api/v1/customers').set('Origin', origin).send({ name: 'No csrf' })).status, 403);
  assert.equal((await a.agent.post('/api/v1/customers').set('Origin', 'https://attacker.example').set('X-CSRF-Token', a.csrf).send({ name: 'Bad origin' })).status, 403);
  assert.equal((await supertest(app).post('/api/v1/customers').set('Origin', origin).send({ name: 'No session' })).status, 401);
});
test('ledger uses exact minor units, idempotent retries, atomic balance changes and linked reversals', async () => {
  const a = await owner(), c = await Customer.create({ businessId: a.b._id, name: 'Ledger customer' });
  const body = { customerId: String(c._id), kind: 'given', amount: 500000, note: 'Credit', idempotencyKey: crypto.randomUUID() };
  const first = await a.send('post', '/entries', body); assert.equal(first.status, 201, JSON.stringify(first.body));
  const retry = await a.send('post', '/entries', body); assert.equal(retry.body._id, first.body._id);
  assert.equal((await a.send('post', '/entries', { ...body, amount: 400000 })).status, 409);
  const payment = await a.send('post', '/entries', { ...body, kind: 'received', amount: 200000, idempotencyKey: crypto.randomUUID() }); assert.equal(payment.status, 201);
  assert.equal((await Customer.findById(c._id)).balance, 300000);
  const reversal = await a.send('post', `/entries/${payment.body._id}/reverse`, { note: 'Payment entered in error', idempotencyKey: crypto.randomUUID() }); assert.equal(reversal.status, 200, JSON.stringify(reversal.body));
  assert.equal((await Customer.findById(c._id)).balance, 500000);
  assert.equal((await a.send('post', `/entries/${payment.body._id}/reverse`, { note: 'Second reversal attempt', idempotencyKey: crypto.randomUUID() })).status, 409);
  assert.equal(await Entry.countDocuments({ customerId: c._id }), 3);
  assert.equal((await a.send('post', '/entries', { ...body, amount: 1.5, idempotencyKey: crypto.randomUUID() })).status, 400);
});
test('concurrent distinct ledger writes reconcile and repeated request applies once', async () => {
  const a = await owner(), c = await Customer.create({ businessId: a.b._id, name: 'Concurrent customer' });
  const base = { customerId: String(c._id), kind: 'given', amount: 101, idempotencyKey: crypto.randomUUID() };
  const repeated = await Promise.all([a.send('post', '/entries', base), a.send('post', '/entries', base)]);
  assert.ok(repeated.every(r => r.status === 201), JSON.stringify(repeated.map(r => r.body)));
  assert.equal((await Customer.findById(c._id)).balance, 101);
  const writes = await Promise.all(Array.from({ length: 5 }, () => a.send('post', '/entries', { ...base, idempotencyKey: crypto.randomUUID() })));
  assert.ok(writes.every(r => r.status === 201)); assert.equal((await Customer.findById(c._id)).balance, 606);
});
test('invoices atomically update ledger and stock; insufficient or foreign stock rolls back', async () => {
  const a = await owner(), b = await owner(), c = await Customer.create({ businessId: a.b._id, name: 'Invoice customer' });
  assert.equal((await a.send('patch', '/profile', { featureToggles: { bills: true, inventory: true } })).status, 200);
  const p = await Product.create({ businessId: a.b._id, name: 'Tea', sku: 'TEA', price: 10000, cost: 8000, stock: 10 });
  const request = { customerId: String(c._id), items: [{ productId: String(p._id), name: 'Tea', quantity: 2, price: 10000, taxRate: 500 }], idempotencyKey: crypto.randomUUID() };
  const bill = await a.send('post', '/bills', request); assert.equal(bill.status, 201, JSON.stringify(bill.body)); assert.equal(bill.body.total, 21000);
  assert.equal((await a.send('post', '/bills', request)).body._id, bill.body._id);
  assert.equal((await Product.findById(p._id)).stock, 8); assert.equal((await Customer.findById(c._id)).balance, 21000);
  assert.equal((await a.send('post', '/bills', { ...request, items: [{ ...request.items[0], quantity: 100 }], idempotencyKey: crypto.randomUUID() })).status, 400);
  assert.equal((await Product.findById(p._id)).stock, 8); assert.equal(await Bill.countDocuments({ businessId: a.b._id }), 1);
  const foreign = await Product.create({ businessId: b.b._id, name: 'Other product', sku: 'OTHER', stock: 20 });
  assert.equal((await a.send('post', '/bills', { ...request, items: [{ ...request.items[0], productId: String(foreign._id) }], idempotencyKey: crypto.randomUUID() })).status, 400);
});
test('two device sessions remain independent and revocation is immediate', async () => {
  const a = await owner(), second = supertest.agent(app);
  const login = await second.post('/api/v1/auth/google').set('Origin', origin).send({ token: googleToken(a.u.email) }); assert.equal(login.status, 200);
  assert.equal((await a.agent.get('/api/v1/auth/session')).status, 200); assert.equal((await second.get('/api/v1/auth/session')).status, 200);
  assert.equal(await Session.countDocuments({ userId: a.u._id }), 2);
  assert.equal((await a.send('post', '/auth/devices/revoke-others')).status, 200);
  assert.equal((await second.get('/api/v1/auth/session')).status, 401); assert.equal((await a.agent.get('/api/v1/auth/session')).status, 200);
});
test('mobile login sends a code only to its bound email, locks attempts and rejects replay', async () => {
  const a = await owner();
  let request = await a.agent.post('/api/v1/auth/otp/request').set('Origin', origin).send({ mobile: a.u.mobile }); assert.equal(request.status, 202);
  const correct = await codeFor(a.u.email), wrong = correct === '000000' ? '111111' : '000000';
  for (let i = 0; i < 5; i++) assert.equal((await a.agent.post('/api/v1/auth/otp/verify').set('Origin', origin).send({ ...request.body, code: wrong })).status, 400);
  assert.equal((await a.agent.post('/api/v1/auth/otp/verify').set('Origin', origin).send({ ...request.body, code: correct })).status, 400);
  await RateBucket.deleteMany({});
  request = await a.agent.post('/api/v1/auth/otp/request').set('Origin', origin).send({ mobile: a.u.mobile });
  const verify = () => a.agent.post('/api/v1/auth/otp/verify').set('Origin', origin).send({ ...request.body, code: correctCode });
  const correctCode = await codeFor(a.u.email);
  assert.equal((await verify()).status, 200); assert.equal((await verify()).status, 400);
  assert.equal((await a.agent.post('/api/v1/auth/otp/request').set('Origin', origin).send({ email: a.u.email, purpose: 'login' })).status, 400);
});

test('shared khata mirrors both directions, timestamps, reversals and attachments exactly once', async () => {
  const a = await owner(), b = await owner(), outsider = await owner();
  const create = await a.send('post', '/customers', { name: b.u.name, mobile: b.u.mobile }); assert.equal(create.status, 201, JSON.stringify(create.body));
  const ca = await Customer.findById(create.body._id), cb = await Customer.findOne({ businessId: b.b._id, linkedUserId: a.u._id }); assert.ok(cb);
  const { Attachment } = await import('../src/models.js');
  const attachment = await Attachment.create({ ownerId: a.u._id, asset: { publicId: 'test-only', version: 1 } });
  const body = { customerId: String(ca._id), kind: 'given', action: 'udhar', amount: 50000, date: '2026-09-18T06:42:00.000Z', attachmentId: String(attachment._id), idempotencyKey: crypto.randomUUID() };
  const first = await a.send('post', '/entries', body); assert.equal(first.status, 201, JSON.stringify(first.body));
  const retry = await a.send('post', '/entries', body); assert.equal(retry.body._id, first.body._id);
  const mirrored = await Entry.findOne({ sourceEntryId: first.body._id }); assert.equal(mirrored.delta, -50000); assert.equal(mirrored.date.toISOString(), body.date); assert.equal(String(mirrored.attachmentId), String(attachment._id));
  assert.equal((await Customer.findById(cb._id)).balance, -50000);
  assert.equal((await b.send('post', `/entries/${mirrored._id}/reverse`, { note: 'Not my entry', idempotencyKey: crypto.randomUUID() })).status, 400);
  assert.equal((await outsider.agent.get(`/api/v1/media/attachment/${attachment._id}`)).status, 404);
  const paid = await b.send('post', '/entries', { customerId: String(cb._id), kind: 'given', action: 'payment', amount: 20000, idempotencyKey: crypto.randomUUID() }); assert.equal(paid.status, 201, JSON.stringify(paid.body));
  assert.equal((await Customer.findById(ca._id)).balance, 30000); assert.equal((await Customer.findById(cb._id)).balance, -30000);
  const reversed = await a.send('post', `/entries/${first.body._id}/reverse`, { note: 'Correct original credit', idempotencyKey: crypto.randomUUID() }); assert.equal(reversed.status, 200, JSON.stringify(reversed.body));
  assert.equal((await Customer.findById(ca._id)).balance, -20000); assert.equal((await Customer.findById(cb._id)).balance, 20000);
  assert.equal(await Entry.countDocuments({ businessId: a.b._id }), 3); assert.equal(await Entry.countDocuments({ businessId: b.b._id }), 3);
  const ws = await b.agent.get('/api/v1/workspace'); assert.equal(ws.status, 200, JSON.stringify(ws.body)); assert.equal(ws.body.customers[0].name, a.u.name);
  assert.equal((await a.send('patch', `/customers/${ca._id}`, { mobile: outsider.u.mobile })).status, 409);
});

test('historical entries and reversals become shared when the recipient registers later', async () => {
  const a = await owner(), phone = '+919876123456';
  const c = await a.send('post', '/customers', { name: 'Future user', mobile: phone });
  const first = await a.send('post', '/entries', { customerId: c.body._id, kind: 'given', amount: 10000, idempotencyKey: crypto.randomUUID() });
  await a.send('post', `/entries/${first.body._id}/reverse`, { note: 'Corrected entry', idempotencyKey: crypto.randomUUID() });
  const b = await owner(); await User.updateOne({ _id: b.u._id }, { $set: { mobile: phone } });
  const ws = await b.agent.get('/api/v1/workspace'); assert.equal(ws.status, 200, JSON.stringify(ws.body));
  assert.equal(ws.body.entries.length, 2); assert.equal(ws.body.customers[0].balance, 0);
  assert.equal((await b.agent.get('/api/v1/workspace')).body.entries.length, 2);
});

test('shared invoices and UPI confirmations reconcile both participants', async () => {
  const a = await owner(), b = await owner();
  const c = await a.send('post', '/customers', { name: b.u.name, mobile: b.u.mobile });
  await a.send('patch', '/profile', { featureToggles: { bills: true } });
  await a.send('patch', '/business', { upiId: 'merchant@bank' });
  const bill = await a.send('post', '/bills', { customerId: c.body._id, items: [{ name: 'Rice', quantity: 1, price: 10000, taxRate: 0 }], idempotencyKey: crypto.randomUUID() }); assert.equal(bill.status, 201, JSON.stringify(bill.body));
  const request = await a.send('post', '/payment-requests', { customerId: c.body._id, amount: 4000, idempotencyKey: crypto.randomUUID() }); assert.equal(request.status, 201);
  const confirmed = await a.send('post', `/payment-requests/${request.body._id}/confirm`); assert.equal(confirmed.status, 200, JSON.stringify(confirmed.body));
  assert.equal((await Customer.findById(c.body._id)).balance, 6000); assert.equal((await Customer.findOne({ businessId: b.b._id, linkedUserId: a.u._id })).balance, -6000);
  assert.equal((await a.send('post', `/payment-requests/${request.body._id}/confirm`)).status, 409);
});

test('contact changes verify old/new inboxes, enforce cooldown and annual limits, preserve Google ID', async () => {
  const a = await owner(), email = 'changed-contact@example.test';
  const request = await a.send('post', '/auth/profile-change/request', { kind: 'email', value: email }); assert.equal(request.status, 200, JSON.stringify(request.body));
  assert.equal((await Challenge.findById(request.body.challengeId)).email, a.u.email);
  const next = await a.send('post', '/auth/profile-change/verify', { ...request.body, code: await codeFor(a.u.email) }); assert.equal(next.status, 200, JSON.stringify(next.body)); assert.equal(next.body.needsNewEmail, true);
  assert.equal((await User.findById(a.u._id)).email, a.u.email);
  const final = await a.send('post', '/auth/profile-change/verify', { ...next.body, code: await codeFor(email) }); assert.equal(final.status, 200, JSON.stringify(final.body)); assert.equal(final.body.user.email, email);
  assert.equal((await User.findById(a.u._id)).googleId, a.u.email);
  assert.equal((await a.send('post', '/auth/profile-change/request', { kind: 'mobile', value: '+919812345678' })).status, 429);
  const old = new Date(Date.now() - 8 * 86400000);
  await User.updateOne({ _id: a.u._id }, { $set: { lastContactChangeAt: old, contactChanges: [{ kind: 'email', at: old }, { kind: 'email', at: old }] } });
  assert.equal((await a.send('post', '/auth/profile-change/request', { kind: 'email', value: 'third@example.test' })).status, 429);
  await RateBucket.deleteMany({});
  const mobileRequest = await a.send('post', '/auth/profile-change/request', { kind: 'mobile', value: '9812345678' }); assert.equal(mobileRequest.status, 200, JSON.stringify(mobileRequest.body));
  const mobileResult = await a.send('post', '/auth/profile-change/verify', { ...mobileRequest.body, code: await codeFor(email) }); assert.equal(mobileResult.status, 200, JSON.stringify(mobileResult.body)); assert.equal(mobileResult.body.user.mobile, '+919812345678');
  await User.updateOne({ _id: a.u._id }, { $set: { lastContactChangeAt: old } });
  assert.equal((await a.send('post', '/auth/profile-change/request', { kind: 'mobile', value: '9812345679' })).status, 429);
  await RateBucket.deleteMany({});
  const login = await a.agent.post('/api/v1/auth/otp/request').set('Origin', origin).send({ mobile: '+919812345678' });
  assert.equal((await Challenge.findById(login.body.challengeId)).email, email);
});

test('Indian numbers and text size limits are enforced by the server', async () => {
  const a = await owner();
  assert.equal((await a.send('post', '/customers', { name: 'Invalid phone', mobile: '+14155552671' })).status, 400);
  const c = await a.send('post', '/customers', { name: 'India', mobile: '98765 49999' }); assert.equal(c.body.mobile, '+919876549999');
  assert.equal((await a.send('patch', '/business', { phone: '+441234567890' })).status, 400);
  assert.equal((await a.send('patch', '/profile', { fontScale: 2.5 })).body.user.fontScale, 2.5);
  assert.equal((await a.send('patch', '/profile', { fontScale: 2.6 })).status, 400);
});

test('attachment ownership failures roll back ledger and both balances', async () => {
  const a = await owner(), b = await owner();
  const c = await a.send('post', '/customers', { name: b.u.name, mobile: b.u.mobile });
  const { Attachment } = await import('../src/models.js');
  const foreign = await Attachment.create({ ownerId: b.u._id, asset: {} });
  const result = await a.send('post', '/entries', { customerId: c.body._id, kind: 'given', amount: 1000, attachmentId: String(foreign._id), idempotencyKey: crypto.randomUUID() }); assert.equal(result.status, 400);
  assert.equal(await Entry.countDocuments({ businessId: a.b._id }), 0); assert.equal(await Entry.countDocuments({ businessId: b.b._id }), 0); assert.equal((await Customer.findById(c.body._id)).balance, 0);
});

test('concurrent writes from both shared participants retain equal and opposite balances', async () => {
  const a = await owner(), b = await owner();
  const c = await a.send('post', '/customers', { name: b.u.name, mobile: b.u.mobile });
  const peer = await Customer.findOne({ businessId: b.b._id, linkedUserId: a.u._id });
  const writes = await Promise.all([
    a.send('post', '/entries', { customerId: c.body._id, kind: 'given', action: 'udhar', amount: 701, idempotencyKey: crypto.randomUUID() }),
    b.send('post', '/entries', { customerId: String(peer._id), kind: 'given', action: 'advance', amount: 203, idempotencyKey: crypto.randomUUID() }),
    a.send('post', '/entries', { customerId: c.body._id, kind: 'received', action: 'payment', amount: 101, idempotencyKey: crypto.randomUUID() }),
  ]);
  assert.ok(writes.every(r => r.status === 201), JSON.stringify(writes.map(r => r.body)));
  assert.equal((await Customer.findById(c.body._id)).balance, 397);
  assert.equal((await Customer.findById(peer._id)).balance, -397);
  assert.equal(await Entry.countDocuments({ businessId: a.b._id }), 3); assert.equal(await Entry.countDocuments({ businessId: b.b._id }), 3);
});

test('shared identity survives a mobile change and old OTPs cannot sign into new contacts', async () => {
  const a = await owner(), b = await owner();
  const c = await a.send('post', '/customers', { name: b.u.name, mobile: b.u.mobile });
  const oldLogin = await b.agent.post('/api/v1/auth/otp/request').set('Origin', origin).send({ mobile: b.u.mobile });
  const oldCode = await codeFor(b.u.email);
  await User.updateOne({ _id: b.u._id }, { $set: { mobile: '+919111222333' } });
  assert.equal((await b.agent.post('/api/v1/auth/otp/verify').set('Origin', origin).send({ ...oldLogin.body, code: oldCode })).status, 400);
  const ws = await a.agent.get('/api/v1/workspace'); assert.equal(ws.body.customers[0].mobile, '+919111222333');
  const paid = await a.send('post', '/entries', { customerId: c.body._id, kind: 'received', amount: 100, idempotencyKey: crypto.randomUUID() }); assert.equal(paid.status, 201, JSON.stringify(paid.body));
  assert.equal((await Customer.findOne({ businessId: b.b._id, linkedUserId: a.u._id })).balance, 100);
});

test('expired annual contact changes no longer count but duplicate mobile changes remain blocked', async () => {
  const a = await owner(), b = await owner(); const old = new Date(Date.now() - 366 * 86400000);
  await User.updateOne({ _id: a.u._id }, { $set: { lastContactChangeAt: old, contactChanges: [{ kind: 'mobile', at: old }, { kind: 'email', at: old }, { kind: 'email', at: old }] } });
  assert.equal((await a.send('post', '/auth/profile-change/request', { kind: 'mobile', value: b.u.mobile })).status, 409);
  assert.equal((await a.send('post', '/auth/profile-change/request', { kind: 'mobile', value: '+919011223344' })).status, 200);
});
