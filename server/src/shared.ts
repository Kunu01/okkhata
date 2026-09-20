import mongoose, { type ClientSession } from 'mongoose';
import { Business, Customer, Entry, Notification, User } from './models.js';
import { ensure, mobile } from './security.js';

// Each participant has their own customer row and an opposite-signed copy of
// each event. sourceEntryId makes mirroring idempotent and preserves authorship.
export async function mirrorEntry(entry: any, customer: any, session: ClientSession) {
  if (!customer.linkedUserId || entry.sourceEntryId) return;
  const business = await Business.findById(entry.businessId).session(session);
  const peerBusiness = await Business.findOne({ ownerId: customer.linkedUserId }).session(session);
  const peer = peerBusiness && await Customer.findOne({ businessId: peerBusiness._id, linkedUserId: business.ownerId }).session(session);
  ensure(peer, 409, 'Shared customer connection is unavailable. Try again.');
  if (await Entry.exists({ sourceEntryId: entry._id }).session(session)) return;
  let reversalOf;
  if (entry.reversalOf) {
    const counterpart = await Entry.findOne({ sourceEntryId: entry.reversalOf }).session(session);
    ensure(counterpart, 409, 'Original shared entry is unavailable.'); reversalOf = counterpart._id;
  }
  const [copy] = await Entry.create([{
    businessId: peer.businessId, customerId: peer._id, actorId: entry.actorId,
    sourceEntryId: entry._id, kind: entry.kind === 'reversal' ? 'reversal' : entry.kind === 'given' ? 'received' : 'given',
    amount: entry.amount, delta: -entry.delta, date: entry.date, note: entry.note,
    action: entry.action, attachmentId: entry.attachmentId, ...(reversalOf ? { reversalOf } : {}),
    idempotencyKey: `shared:${entry._id}`,
  }], { session });
  const updated = await Customer.findByIdAndUpdate(peer._id, { $inc: { balance: -entry.delta }, $set: { archived: false } }, { session, new: true });
  ensure(Number.isSafeInteger(updated.balance), 400, 'Balance exceeds the supported amount.');
  await Notification.create([{ businessId: peer.businessId, userId: customer.linkedUserId, title: 'Shared khata updated', body: `${peer.name} recorded an entry of ₹${(entry.amount / 100).toFixed(2)}`, href: `/customers/${peer._id}`, eventKey: String(copy._id) }], { session });
}

export async function connectCustomer(customer: any, session: ClientSession) {
  const business = await Business.findById(customer.businessId).session(session);
  const owner = await User.findById(business.ownerId).session(session);
  const phone = mobile.safeParse(customer.mobile);
  const peerUser = customer.linkedUserId ? await User.findById(customer.linkedUserId).session(session) : phone.success ? await User.findOne({ mobile: phone.data }).session(session) : null;
  if (!peerUser || String(peerUser._id) === String(owner._id)) return;
  const peerBusiness = await Business.findOne({ ownerId: peerUser._id }).session(session); if (!peerBusiness) return;
  const duplicate = await Customer.exists({ businessId: business._id, linkedUserId: peerUser._id, _id: { $ne: customer._id } }).session(session);
  ensure(!duplicate, 409, 'This person already has a shared customer account. Use that account.');
  customer.linkedUserId = peerUser._id; customer.mobile = peerUser.mobile; await customer.save({ session });
  let peer = await Customer.findOne({ businessId: peerBusiness._id, linkedUserId: owner._id }).session(session);
  if (!peer) peer = await Customer.findOne({ businessId: peerBusiness._id, mobile: owner.mobile, linkedUserId: { $exists: false } }).sort({ createdAt: 1 }).session(session);
  if (!peer) [peer] = await Customer.create([{ businessId: peerBusiness._id, name: owner.name, mobile: owner.mobile, linkedUserId: owner._id }], { session });
  else { peer.linkedUserId = owner._id; await peer.save({ session }); }
  // Include historical entries when the other person joins later. Oldest first
  // ensures that original entries are copied before their reversals.
  for (const row of [customer, peer]) {
    const entries = await Entry.find({ customerId: row._id, sourceEntryId: { $exists: false } }).sort({ createdAt: 1, _id: 1 }).session(session);
    for (const entry of entries) await mirrorEntry(entry, row, session);
  }
}

export async function connectPendingCustomers(userId: string) {
  const user = await User.findById(userId);
  const business = await Business.findOne({ ownerId: userId });
  const candidates = await Customer.find({ linkedUserId: { $exists: false }, $or: [{ mobile: user.mobile }, { businessId: business._id, mobile: { $regex: /^\+91[6-9]\d{9}$/ } }] }).select('_id');
  for (const candidate of candidates) {
    await mongoose.connection.transaction(async session => {
      const customer = await Customer.findById(candidate._id).session(session);
      if (customer && !customer.linkedUserId) await connectCustomer(customer, session);
    });
  }
}

export async function enrichCustomers(customers: any[]) {
  const ids = customers.filter(c => c.linkedUserId).map(c => c.linkedUserId);
  const users = await User.find({ _id: { $in: ids } }).select('name photo mobile').lean();
  const businesses = await Business.find({ ownerId: { $in: ids } }).select('ownerId upiId upiQr').lean();
  return customers.map(c => {
    const u: any = users.find(u => String(u._id) === String(c.linkedUserId));
    const b: any = businesses.find(b => String(b.ownerId) === String(c.linkedUserId));
    return { ...c, photo: c.photo?.url || (u?.photo ? `/api/v1/media/user/${u._id}/profile?v=${u.photo.version}` : undefined), ...(u ? { name: u.name, mobile: u.mobile, upiId: b?.upiId, upiQr: b?.upiQr ? `/api/v1/media/user/${u._id}/upiQr?v=${b.upiQr.version}` : undefined } : {}) };
  });
}
