import mongoose, { Schema } from 'mongoose';
const oid = Schema.Types.ObjectId;
const define = (name: string, fields: Record<string, any>, indexes: [Record<string, any>, Record<string, any>?][] = []) => {
  const schema = new Schema(fields, { timestamps: true, strict: 'throw' });
  for (const [keys, options] of indexes) schema.index(keys, options);
  return mongoose.model<any>(name, schema);
};
export const User = define('User', {
  name: { type: String, default: '' }, email: { type: String, required: true, unique: true },
  mobile: { type: String, required: true, unique: true }, passwordHash: String, passcodeHash: String,
  emailVerifiedAt: Date, googleId: String, photo: Schema.Types.Mixed,
  theme: { type: String, default: 'forest' }, mode: { type: String, default: 'light' }, customColor: String,
  fontFamily: { type: String, default: 'dm-sans' }, fontScale: { type: Number, default: 1.25 }, language: { type: String, enum: ['en', 'hi', 'gu', 'hinglish'], default: 'en' },
  accountMode: { type: String, enum: ['personal', 'business'], default: 'personal' },
  showContactDetails: { type: Boolean, default: false },
  featureToggles: { type: Schema.Types.Mixed, default: { customers: true, transactions: true, bills: false, inventory: false, reports: false, notifications: false } },
  lastContactChangeAt: Date, contactChanges: { type: [new Schema({ kind: String, at: Date }, { _id: false })], default: [] },
}, [[{ googleId: 1 }, { unique: true, sparse: true }]]);
export const Business = define('Business', {
  ownerId: { type: oid, required: true, unique: true }, name: { type: String, default: 'My business' },
  phone: String, email: String, address: String, gstin: String, logo: Schema.Types.Mixed,
  upiId: { type: String, default: '' }, upiQr: Schema.Types.Mixed,
  invoiceSequence: { type: Number, default: 0 },
});
export const Session = define('Session', {
  userId: { type: oid, required: true }, tokenHash: { type: String, unique: true }, csrfHash: String,
  device: String, lastSeen: Date, expiresAt: Date, authenticatedAt: Date,
}, [[{ expiresAt: 1 }, { expireAfterSeconds: 0 }], [{ userId: 1 }]]);
export const Challenge = define('Challenge', {
  email: String, purpose: String, digest: String, continuationHash: String,
  attempts: { type: Number, default: 0 }, expiresAt: Date, consumedAt: Date, payload: Schema.Types.Mixed,
}, [[{ expiresAt: 1 }, { expireAfterSeconds: 0 }]]);
export const RateBucket = define('RateBucket', { key: { type: String, unique: true }, count: Number, expiresAt: Date }, [[{ expiresAt: 1 }, { expireAfterSeconds: 0 }]]);
export const Customer = define('Customer', {
  businessId: { type: oid, required: true }, name: { type: String, required: true }, mobile: String, email: String,
  address: String, note: String, dueDate: Date, archived: { type: Boolean, default: false },
  balance: { type: Number, default: 0 }, photo: Schema.Types.Mixed, linkedUserId: oid,
}, [[{ businessId: 1, archived: 1, name: 1 }], [{ businessId: 1, linkedUserId: 1 }, { unique: true, partialFilterExpression: { linkedUserId: { $type: 'objectId' } } }]]);
export const Entry = define('Entry', {
  businessId: { type: oid, required: true }, customerId: { type: oid, required: true },
  kind: { type: String, enum: ['given', 'received', 'reversal'], required: true },
  amount: { type: Number, required: true }, delta: Number, note: String, date: Date,
  actorId: oid, idempotencyKey: String, requestHash: String, reversalOf: oid, billId: oid,
  sourceEntryId: oid, attachmentId: oid, action: String,
}, [[{ businessId: 1, idempotencyKey: 1 }, { unique: true }], [{ sourceEntryId: 1 }, { unique: true, sparse: true }], [{ reversalOf: 1 }, { unique: true, sparse: true }], [{ businessId: 1, customerId: 1, date: -1 }]]);
export const Attachment = define('Attachment', { ownerId: oid, entryId: oid, asset: Schema.Types.Mixed });
export const Product = define('Product', {
  businessId: { type: oid, required: true }, name: String, sku: String, price: Number, cost: Number,
  stock: { type: Number, default: 0 }, minimum: { type: Number, default: 5 }, unit: { type: String, default: 'pcs' },
}, [[{ businessId: 1, sku: 1 }, { unique: true }]]);
export const StockMovement = define('StockMovement', { businessId: oid, productId: oid, quantity: Number, reason: String, actorId: oid, key: String }, [[{ businessId: 1, key: 1 }, { unique: true }]]);
export const Bill = define('Bill', {
  businessId: oid, customerId: oid, number: String, items: [Schema.Types.Mixed], subtotal: Number,
  tax: Number, total: Number, dueDate: Date, note: String, idempotencyKey: String, requestHash: String,
}, [[{ businessId: 1, number: 1 }, { unique: true }], [{ businessId: 1, idempotencyKey: 1 }, { unique: true }]]);
export const Notification = define('Notification', { businessId: oid, userId: oid, title: String, body: String, href: String, readAt: Date, eventKey: String }, [[{ userId: 1, eventKey: 1 }, { unique: true }]]);
export const PaymentRequest = define('PaymentRequest', {
  businessId: { type: oid, required: true }, customerId: { type: oid, required: true },
  amount: { type: Number, required: true }, currency: { type: String, default: 'INR' },
  upiId: { type: String, required: true }, intent: { type: String, required: true },
  status: { type: String, enum: ['created', 'opened', 'paid', 'cancelled'], default: 'created' },
  idempotencyKey: { type: String, required: true }, requestHash: String, createdBy: oid, openedAt: Date, paidAt: Date, paidBy: oid,
  entryId: oid, note: String,
}, [[{ businessId: 1, idempotencyKey: 1 }, { unique: true }], [{ businessId: 1, customerId: 1, createdAt: -1 }]]);
export const Audit = define('Audit', { businessId: oid, actorId: oid, action: String, resourceId: String, detail: String });
export const models = [User, Business, Session, Challenge, RateBucket, Customer, Entry, Attachment, Product, StockMovement, Bill, Notification, PaymentRequest, Audit];
