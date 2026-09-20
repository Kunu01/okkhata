import mongoose from 'mongoose';
import { z } from 'zod';
import { Audit, Attachment, Customer, Entry, Notification } from './models.js';
import { ensure, objectId, sha } from './security.js';
import { connectCustomer, mirrorEntry } from './shared.js';
export const amountSchema = z.number().int().positive().max(100_000_000_00);
export const entrySchema = z.object({ customerId: objectId, kind: z.enum(['given', 'received']), amount: amountSchema, action: z.enum(['udhar', 'advance', 'payment']).optional(), attachmentId: objectId.optional(), note: z.string().trim().max(500).default(''), date: z.iso.datetime().optional(), idempotencyKey: z.string().uuid() }).strict();
export async function postEntry(businessId: string, actorId: string, input: unknown) {
  const body = entrySchema.parse(input);
  const requestHash = sha(JSON.stringify(body));
  let result: any;
  await mongoose.connection.transaction(async session => {
    const existing = await Entry.findOne({ businessId, idempotencyKey: body.idempotencyKey }).session(session);
    if (existing) { ensure(existing.requestHash === requestHash, 409, 'This request key was used for different transaction details.'); result = existing; return; }
    const priorCustomer = await Customer.findOne({ _id: body.customerId, businessId, archived: false }).session(session);
    ensure(priorCustomer, 404, 'Customer not found or archived.');
    await connectCustomer(priorCustomer, session);
    const delta = body.kind === 'given' ? body.amount : -body.amount;
    const customer = await Customer.findOneAndUpdate({ _id: body.customerId, businessId, archived: false }, { $inc: { balance: delta } }, { new: true, session });
    ensure(customer, 404, 'Customer not found or archived.');
    ensure(Number.isSafeInteger(customer.balance), 400, 'Balance exceeds the supported amount.');
    const entryDate = body.date ? new Date(body.date) : new Date();
    ensure(entryDate.getTime() <= Date.now() + 300000, 400, 'Transaction date cannot be in the future.');
    [result] = await Entry.create([{ ...body, date: entryDate, delta, businessId, actorId, requestHash }], { session });
    if (body.attachmentId) {
      const attached = await Attachment.findOneAndUpdate({ _id: body.attachmentId, ownerId: actorId, entryId: { $exists: false } }, { $set: { entryId: result._id } }, { session });
      ensure(attached, 400, 'Attachment unavailable or already used.');
    }
    await mirrorEntry(result, customer, session);
    await Audit.create([{ businessId, actorId, action: 'ENTRY_CREATED', resourceId: String(result._id), detail: body.kind }], { session });
    await Notification.create([{ businessId, userId: actorId, title: body.kind === 'received' ? 'Payment recorded' : 'Credit recorded', body: `${customer.name} · ₹${(body.amount / 100).toFixed(2)}`, href: `/customers/${customer._id}`, eventKey: String(result._id) }], { session });
  });
  return result;
}
export async function reverseEntry(businessId: string, actorId: string, entryId: string, note: string, idempotencyKey: string) {
  let result: any;
  await mongoose.connection.transaction(async session => {
    const prior = await Entry.findOne({ businessId, idempotencyKey }).session(session);
    if (prior) { ensure(String(prior.reversalOf) === entryId && prior.note === note, 409, 'Request key already used.'); result = prior; return; }
    const original = await Entry.findOne({ _id: entryId, businessId }).session(session);
    ensure(original && original.kind !== 'reversal' && !original.billId && !original.sourceEntryId && String(original.actorId) === actorId, 400, 'This entry cannot be reversed here.');
    ensure(!await Entry.exists({ reversalOf: original._id }).session(session), 409, 'This entry has already been reversed.');
    await Customer.updateOne({ _id: original.customerId, businessId }, { $inc: { balance: -original.delta } }, { session });
    [result] = await Entry.create([{ businessId, actorId, customerId: original.customerId, kind: 'reversal', amount: original.amount, delta: -original.delta, reversalOf: original._id, date: new Date(), note, idempotencyKey }], { session });
    const customer = await Customer.findById(original.customerId).session(session);
    await connectCustomer(customer, session);
    await mirrorEntry(result, customer, session);
    await Audit.create([{ businessId, actorId, action: 'ENTRY_REVERSED', resourceId: entryId, detail: note }], { session });
    await Notification.create([{ businessId, userId: actorId, title: 'Transaction reversed', body: note, href: `/customers/${original.customerId}`, eventKey: String(result._id) }], { session });
  });
  return result;
}
