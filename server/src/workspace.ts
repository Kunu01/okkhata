import { Router } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { Audit, Bill, Business, Customer, Entry, Notification, PaymentRequest, Product, StockMovement, User } from './models.js';
import { authenticate, ensure, mobile, objectId, publicUser, rate, requireFeature, sha } from './security.js';
import { amountSchema, postEntry, reverseEntry } from './ledger.js';
import { connectCustomer, connectPendingCustomers, enrichCustomers, mirrorEntry } from './shared.js';
export const workspace = Router();
workspace.use(authenticate, rate('workspace', 180));
const text = (max = 150) => z.string().trim().max(max);
const customerSchema = z.object({ name: text(80).min(1), mobile: z.union([z.literal(''), mobile]).default(''), email: z.union([z.email(), z.literal('')]).default(''), address: text(300).default(''), note: text(500).default(''), dueDate: z.union([z.iso.datetime(), z.literal('')]).optional() }).strict();
workspace.get('/workspace', async (req, res) => {
  await connectPendingCustomers(req.auth!.userId);
  const businessId = req.auth!.business._id;
  const [customers, entries, products, bills, notifications, paymentRequests, totals, monthly] = await Promise.all([
    Customer.find({ businessId }).sort({ createdAt: -1 }).limit(500).lean(),
    Entry.find({ businessId }).sort({ date: -1, createdAt: -1 }).limit(500).lean(),
    Product.find({ businessId }).sort({ name: 1 }).limit(500).lean(),
    Bill.find({ businessId }).sort({ createdAt: -1 }).limit(500).lean(),
    Notification.find({ userId: req.auth!.userId }).sort({ createdAt: -1 }).limit(50).lean(),
    PaymentRequest.find({ businessId }).sort({ createdAt: -1 }).limit(500).lean(),
    Customer.aggregate([{ $match: { businessId } }, { $group: { _id: null, receivable: { $sum: { $max: ['$balance', 0] } }, advance: { $sum: { $max: [{ $multiply: ['$balance', -1] }, 0] } }, customers: { $sum: 1 } } }]),
    Entry.aggregate([{ $match: { businessId, date: { $gte: new Date(Date.now() - 180 * 86400000) } } }, { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$date', timezone: 'Asia/Kolkata' } }, given: { $sum: { $cond: [{ $gt: ['$delta', 0] }, '$delta', 0] } }, received: { $sum: { $cond: [{ $lt: ['$delta', 0] }, { $multiply: ['$delta', -1] }, 0] } } } }, { $sort: { _id: 1 } }]),
  ]);
  const features = req.auth!.features;
  res.json({ business: req.auth!.business, customers: features.customers ? await enrichCustomers(customers) : [], entries: features.transactions ? entries : [], products: features.inventory ? products : [], bills: features.bills ? bills : [], notifications: features.notifications ? notifications : [], paymentRequests: features.transactions ? paymentRequests : [], totals: totals[0] || { receivable: 0, advance: 0, customers: 0 }, monthly: features.reports ? monthly : [], recordLimit: 500 });
});
workspace.get('/customers', async (req, res) => {
  const query = z.object({ q: z.string().max(100).default(''), page: z.coerce.number().int().min(1).max(10000).default(1) }).parse(req.query);
  const filter = { businessId: req.auth!.business._id, name: { $regex: query.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } };
  res.json({ items: await enrichCustomers(await Customer.find(filter).sort({ name: 1 }).skip((query.page - 1) * 50).limit(50).lean()), total: await Customer.countDocuments(filter) });
});
workspace.use('/bills', requireFeature('bills'));
workspace.use('/products', requireFeature('inventory'));
workspace.post('/customers', async (req, res) => {
  const body = customerSchema.parse(req.body);
  let customer: any;
  await mongoose.connection.transaction(async session => {
    if (body.mobile) ensure(!await Customer.exists({ businessId: req.auth!.business._id, mobile: body.mobile }).session(session), 409, 'This mobile number already has a customer account.');
    [customer] = await Customer.create([{ ...body, dueDate: body.dueDate || undefined, businessId: req.auth!.business._id }], { session });
    await connectCustomer(customer, session);
  });
  res.status(201).json(customer);
});
workspace.patch('/customers/:id', async (req, res) => {
  const id = objectId.parse(req.params.id), body = customerSchema.partial().extend({ archived: z.boolean().optional() }).strict().parse(req.body);
  let c: any;
  await mongoose.connection.transaction(async session => {
    c = await Customer.findOne({ _id: id, businessId: req.auth!.business._id }).session(session); ensure(c, 404, 'Customer not found.');
    if (c.linkedUserId) await connectCustomer(c, session);
    if (body.mobile !== undefined && body.mobile !== c.mobile) {
      ensure(!c.linkedUserId && !await Entry.exists({ customerId: id }).session(session), 409, 'A customer with ledger history cannot be reassigned to another mobile number.');
      if (body.mobile) ensure(!await Customer.exists({ businessId: c.businessId, mobile: body.mobile, _id: { $ne: c._id } }).session(session), 409, 'This mobile already has a customer account.');
    }
    Object.assign(c, body, body.dueDate === '' ? { dueDate: null } : {}); await c.save({ session });
    await connectCustomer(c, session);
  });
  ensure(c, 404, 'Customer not found.'); res.json(c);
});
workspace.delete('/customers/:id', async (req, res) => {
  const id = objectId.parse(req.params.id);
  const customer = await Customer.findOne({ _id: id, businessId: req.auth!.business._id });
  ensure(customer, 404, 'Customer not found.');
  ensure(customer.balance === 0, 400, 'Cannot delete a customer with an outstanding balance. Please settle the account first.');
  await mongoose.connection.transaction(async session => {
    await Entry.deleteMany({ customerId: id, businessId: req.auth!.business._id }, { session });
    await Bill.deleteMany({ customerId: id, businessId: req.auth!.business._id }, { session });
    await PaymentRequest.deleteMany({ customerId: id, businessId: req.auth!.business._id }, { session });
    await Customer.deleteOne({ _id: id, businessId: req.auth!.business._id }, { session });
  });
  res.json({ ok: true });
});

workspace.get('/customers/:id/entries', async (req, res) => {
  const id = objectId.parse(req.params.id), page = z.coerce.number().int().min(1).default(1).parse(req.query.page);
  ensure(await Customer.exists({ _id: id, businessId: req.auth!.business._id }), 404, 'Customer not found.');
  const filter = { customerId: id, businessId: req.auth!.business._id };
  res.json({ items: await Entry.find(filter).sort({ date: -1 }).skip((page - 1) * 100).limit(100), total: await Entry.countDocuments(filter) });
});
workspace.post('/entries', async (req, res) => { res.status(201).json(await postEntry(String(req.auth!.business._id), req.auth!.userId, req.body)); });
workspace.post('/entries/:id/reverse', async (req, res) => {
  const body = z.object({ note: text(500).min(3), idempotencyKey: z.string().uuid() }).strict().parse(req.body);
  res.json(await reverseEntry(String(req.auth!.business._id), req.auth!.userId, objectId.parse(req.params.id), body.note, body.idempotencyKey));
});
const upiIdSchema = z.string().trim().regex(/^[A-Za-z0-9._-]{2,128}@[A-Za-z0-9.-]{2,64}$/, 'Enter a valid UPI ID, for example yourname@bank.');
const paymentRequestSchema = z.object({ customerId: objectId, amount: amountSchema, note: text(200).default(''), idempotencyKey: z.string().uuid() }).strict();
workspace.get('/payment-requests', async (req, res) => {
  const customerId = req.query.customerId ? objectId.parse(req.query.customerId) : undefined;
  const filter = { businessId: req.auth!.business._id, ...(customerId ? { customerId } : {}) };
  res.json(await PaymentRequest.find(filter).sort({ createdAt: -1 }).limit(200).lean());
});
workspace.post('/payment-requests', async (req, res) => {
  const body = paymentRequestSchema.parse(req.body), business: any = await Business.findById(req.auth!.business._id).lean();
  ensure(business?.upiId, 409, 'Add your UPI ID in Business details before creating a payment request.');
  const customer = await Customer.findOne({ _id: body.customerId, businessId: req.auth!.business._id, archived: false });
  ensure(customer, 404, 'Customer not found.'); ensure(body.amount > 0, 400, 'Payment must be greater than zero.');
  const amount = (body.amount / 100).toFixed(2), intent = `upi://pay?pa=${encodeURIComponent(business.upiId).replace('%40', '@')}&pn=${encodeURIComponent(business.name)}&tr=${encodeURIComponent(body.idempotencyKey)}&am=${amount}&cu=INR&tn=${encodeURIComponent(`OkKhata payment ${customer.name}`).replace(/%20/g, '+')}`;
  const requestHash = sha(JSON.stringify({ ...body, upiId: business.upiId }));
  const existing = await PaymentRequest.findOne({ businessId: business._id, idempotencyKey: body.idempotencyKey });
  if (existing) { ensure(existing.get('requestHash') === requestHash, 409, 'This request key was used for different payment details.'); return res.status(200).json(existing); }
  const request = await PaymentRequest.create({ ...body, businessId: business._id, upiId: business.upiId, intent, createdBy: req.auth!.userId, requestHash });
  res.status(201).json(request);
});
workspace.post('/payment-requests/:id/opened', async (req, res) => {
  const id = objectId.parse(req.params.id); const request = await PaymentRequest.findOneAndUpdate({ _id: id, businessId: req.auth!.business._id, status: 'created' }, { $set: { status: 'opened', openedAt: new Date() } }, { new: true });
  ensure(request, 404, 'Payment request not found or already updated.'); res.json(request);
});
workspace.post('/payment-requests/:id/confirm', async (req, res) => {
  const id = objectId.parse(req.params.id); let entry: any;
  await mongoose.connection.transaction(async session => {
    const request = await PaymentRequest.findOne({ _id: id, businessId: req.auth!.business._id }).session(session); ensure(request, 404, 'Payment request not found.');
    ensure(request.status !== 'paid' && request.status !== 'cancelled', 409, 'This payment request is already completed or cancelled.');
    const customer = await Customer.findOneAndUpdate({ _id: request.customerId, businessId: req.auth!.business._id, archived: false, balance: { $gte: request.amount } }, { $inc: { balance: -request.amount } }, { new: true, session });
    ensure(customer, 409, 'The customer balance changed. Recheck the current outstanding amount before confirming.');
    [entry] = await Entry.create([{ businessId: req.auth!.business._id, customerId: request.customerId, actorId: req.auth!.userId, kind: 'received', amount: request.amount, delta: -request.amount, date: new Date(), note: request.note || `UPI payment · ${request.id}`, idempotencyKey: `upi-confirm:${request.id}`, requestHash: sha(String(request.id)) }], { session });
    await connectCustomer(customer, session);
    await mirrorEntry(entry, customer, session);
    await PaymentRequest.updateOne({ _id: request._id, status: { $ne: 'paid' } }, { $set: { status: 'paid', paidAt: new Date(), paidBy: req.auth!.userId, entryId: entry._id } }, { session });
    await Audit.create([{ businessId: req.auth!.business._id, actorId: req.auth!.userId, action: 'UPI_PAYMENT_CONFIRMED', resourceId: String(request._id), detail: String(request.amount) }], { session });
    await Notification.create([{ businessId: req.auth!.business._id, userId: req.auth!.userId, title: 'UPI payment recorded', body: `${customer.name} · ₹${(request.amount / 100).toFixed(2)}`, href: `/customers/${customer._id}`, eventKey: String(entry._id) }], { session });
  });
  res.json({ requestId: id, entry });
});
workspace.patch('/profile', async (req, res) => {
  const featureToggles = z.object({ customers: z.literal(true).optional(), transactions: z.literal(true).optional(), bills: z.boolean().optional(), inventory: z.boolean().optional(), reports: z.boolean().optional(), notifications: z.boolean().optional() }).strict();
  const body = z.object({ theme: text(30).optional(), mode: z.enum(['light', 'dark', 'system']).optional(), customColor: z.string().regex(/^#[0-9a-f]{6}$/i).optional(), fontFamily: z.enum(['dm-sans', 'manrope', 'inter', 'plus-jakarta', 'nunito', 'lora', 'atkinson']).optional(), fontScale: z.number().min(1.25).max(2.5).optional(), language: z.enum(['en', 'hi', 'gu', 'hinglish']).optional(), accountMode: z.enum(['personal', 'business']).optional(), showContactDetails: z.boolean().optional(), featureToggles: featureToggles.optional() }).strict().parse(req.body);
  const { featureToggles: toggles, ...profile } = body;
  const user = await User.findById(req.auth!.userId); ensure(user, 401, 'Sign in again.');
  if (profile.accountMode === 'personal') profile.showContactDetails = false;
  if (toggles) (user as any).featureToggles = { ...(user.featureToggles || {}), ...toggles, customers: true, transactions: true };
  Object.assign(user, profile); await user.save();
  res.json({ user: publicUser(user) });
});
workspace.patch('/business', async (req, res) => {
  const body = z.object({ name: text(100).min(1).optional(), phone: z.union([z.literal(''), mobile]).optional(), email: text(254).optional(), address: text(500).optional(), gstin: text(15).optional(), upiId: z.union([upiIdSchema, z.literal('')]).optional() }).strict().parse(req.body);
  res.json(await Business.findOneAndUpdate({ ownerId: req.auth!.userId }, { $set: body }, { new: true }));
});
workspace.post('/notifications/read', requireFeature('notifications'), async (req, res) => { await Notification.updateMany({ userId: req.auth!.userId, readAt: null }, { $set: { readAt: new Date() } }); res.json({ ok: true }); });
const productSchema = z.object({ name: text(100).min(1), sku: text(50).min(1), price: z.number().int().min(0).max(100_000_000_00), cost: z.number().int().min(0).max(100_000_000_00).default(0), stock: z.number().int().min(0).max(1000000), minimum: z.number().int().min(0).max(1000000).default(5), unit: text(20).default('pcs') }).strict();
workspace.post('/products', async (req, res) => {
  const body = productSchema.parse(req.body);
  let product: any;
  await mongoose.connection.transaction(async session => {
    [product] = await Product.create([{ ...body, businessId: req.auth!.business._id }], { session });
    await StockMovement.create([{ businessId: req.auth!.business._id, productId: product._id, actorId: req.auth!.userId, quantity: body.stock, reason: 'Opening stock', key: String(product._id) }], { session });
  }); res.status(201).json(product);
});
workspace.post('/products/:id/stock', async (req, res) => {
  const id = objectId.parse(req.params.id), body = z.object({ quantity: z.number().int().min(-1000000).max(1000000).refine(v => v !== 0), reason: text(200).min(3), idempotencyKey: z.string().uuid() }).strict().parse(req.body);
  let product: any;
  await mongoose.connection.transaction(async session => {
    const prior = await StockMovement.findOne({ businessId: req.auth!.business._id, key: body.idempotencyKey }).session(session);
    if (prior) { ensure(String(prior.productId) === id && prior.quantity === body.quantity && prior.reason === body.reason, 409, 'Request key already used.'); product = await Product.findById(id).session(session); return; }
    product = await Product.findOneAndUpdate({ _id: id, businessId: req.auth!.business._id, stock: { $gte: Math.max(0, -body.quantity) } }, { $inc: { stock: body.quantity } }, { new: true, session });
    ensure(product, 400, 'Product unavailable or not enough stock.');
    await StockMovement.create([{ businessId: req.auth!.business._id, productId: id, actorId: req.auth!.userId, quantity: body.quantity, reason: body.reason, key: body.idempotencyKey }], { session });
    await Audit.create([{ businessId: req.auth!.business._id, actorId: req.auth!.userId, action: 'STOCK_ADJUSTED', resourceId: id, detail: body.reason }], { session });
  }); res.json(product);
});
workspace.get('/products/:id/history', async (req, res) => { res.json(await StockMovement.find({ businessId: req.auth!.business._id, productId: objectId.parse(req.params.id) }).sort({ createdAt: -1 }).limit(100)); });
workspace.post('/bills', async (req, res) => {
  const body = z.object({ customerId: objectId, items: z.array(z.object({ productId: objectId.optional(), name: text(100).min(1), quantity: z.number().int().min(1).max(10000), price: amountSchema, taxRate: z.number().int().min(0).max(2800).default(0) }).strict()).min(1).max(100), note: text(500).default(''), dueDate: z.iso.datetime().optional(), idempotencyKey: z.string().uuid() }).strict().parse(req.body);
  const businessId = req.auth!.business._id, requestHash = sha(JSON.stringify(body));
  let bill: any;
  await mongoose.connection.transaction(async session => {
    const existing = await Bill.findOne({ businessId, idempotencyKey: body.idempotencyKey }).session(session);
    if (existing) { ensure(existing.requestHash === requestHash, 409, 'Request key already used.'); bill = existing; return; }
    const customer = await Customer.findOne({ _id: body.customerId, businessId, archived: false }).session(session); ensure(customer, 404, 'Customer not found.');
    let subtotal = 0, tax = 0;
    for (const item of body.items) {
      const base = item.quantity * item.price; subtotal += base; tax += Math.round(base * item.taxRate / 10000);
      if (item.productId) {
        const p = await Product.findOneAndUpdate({ _id: item.productId, businessId, stock: { $gte: item.quantity } }, { $inc: { stock: -item.quantity } }, { new: true, session });
        ensure(p, 400, `Insufficient stock for ${item.name}.`);
        await StockMovement.create([{ businessId, productId: item.productId, actorId: req.auth!.userId, quantity: -item.quantity, reason: 'Invoice sale', key: `${body.idempotencyKey}:${item.productId}` }], { session });
      }
    }
    const total = subtotal + tax; ensure(Number.isSafeInteger(total) && total <= 100_000_000_00, 400, 'Invoice total exceeds the supported amount.');
    const business = await Business.findByIdAndUpdate(businessId, { $inc: { invoiceSequence: 1 } }, { new: true, session });
    [bill] = await Bill.create([{ ...body, businessId, number: `OK-${String(business.invoiceSequence).padStart(5, '0')}`, subtotal, tax, total, requestHash }], { session });
    await Customer.updateOne({ _id: customer._id, businessId }, { $inc: { balance: total } }, { session });
    const [entry] = await Entry.create([{ businessId, customerId: customer._id, actorId: req.auth!.userId, kind: 'given', amount: total, delta: total, date: new Date(), note: `Invoice ${bill.number}`, billId: bill._id, idempotencyKey: body.idempotencyKey, requestHash }], { session });
    await connectCustomer(customer, session);
    await mirrorEntry(entry, customer, session);
    await Audit.create([{ businessId, actorId: req.auth!.userId, action: 'BILL_CREATED', resourceId: String(bill._id) }], { session });
    await Notification.create([{ businessId, userId: req.auth!.userId, title: 'Invoice created', body: `${bill.number} · ${customer.name}`, href: '/bills', eventKey: String(entry!._id) }], { session });
  }); res.status(201).json(bill);
});
