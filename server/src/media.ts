import { Router } from 'express';
import multer from 'multer';
import sharp from 'sharp';
import { v2 as cloudinary } from 'cloudinary';
import { z } from 'zod';
import { Attachment, Business, Customer, Entry, User } from './models.js';
import { authenticate, ensure, objectId, rate, random } from './security.js';
export const media = Router();
media.use(authenticate);
media.use((req, res, next) => req.method === 'GET' ? rate('media-read', 240)(req, res, next) : rate('media-write', 15)(req, res, next));
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 0 } });
function setup() {
  ensure(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET, 503, 'Cloudinary is not configured yet. Add its credentials to the server environment.');
  cloudinary.config({ cloud_name: process.env.CLOUDINARY_CLOUD_NAME, api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET, secure: true });
}
media.post('/:target', upload.single('image'), async (req, res) => {
  const target = z.enum(['profile', 'logo', 'upiQr', 'attachment', 'customer']).parse(req.params.target); setup();
  ensure(req.file, 400, 'Select a JPEG, PNG, or WebP image.');
  const pipeline = sharp(req.file.buffer, { limitInputPixels: 20_000_000, animated: false });
  const info = await pipeline.metadata(); ensure(['jpeg', 'png', 'webp'].includes(info.format || ''), 400, 'Only JPEG, PNG, and WebP images are supported.');
  const buffer = await compressImage(req.file.buffer, target);
  const result: any = await new Promise((resolve, reject) => { const stream = cloudinary.uploader.upload_stream({ resource_type: 'image', type: 'authenticated', public_id: `okkhata/${random()}`, overwrite: false }, (err, asset) => err ? reject(err) : resolve(asset)); stream.end(buffer); });
  const url = `/api/v1/media/${target}?v=${result.version}${target === 'customer' ? `&customerId=${req.query.customerId}` : ''}`;
  const photo = { publicId: result.public_id, assetId: result.asset_id, version: result.version, url };
  try {
    if (target === 'attachment') { const attachment = await Attachment.create({ ownerId: req.auth!.userId, asset: photo }); return res.json({ attachmentId: String(attachment._id) }); }
    if (target === 'customer') {
      const customerId = objectId.parse(req.query.customerId);
      const customer = await Customer.findOne({ _id: customerId, businessId: req.auth!.business._id });
      ensure(customer, 404, 'Customer not found.');
      const old = await Customer.findByIdAndUpdate(customerId, { $set: { photo } });
      if (old?.photo?.publicId) await cloudinary.uploader.destroy(old.photo.publicId, { type: 'authenticated', invalidate: true }).catch(() => {});
      return res.json({ url: photo.url });
    }
    const model = target === 'profile' ? User : Business, id = target === 'profile' ? req.auth!.userId : req.auth!.business._id, field = target === 'profile' ? 'photo' : target === 'upiQr' ? 'upiQr' : 'logo';
    const old = await model.findByIdAndUpdate(id, { $set: { [field]: photo } });
    if (old?.[field]?.publicId) await cloudinary.uploader.destroy(old[field].publicId, { type: 'authenticated', invalidate: true }).catch(() => {});
    res.json({ url: photo.url });
  } catch (err) { await cloudinary.uploader.destroy(result.public_id, { type: 'authenticated', invalidate: true }).catch(() => {}); throw err; }
});
media.get('/attachment/:id', async (req, res) => {
  const id = objectId.parse(req.params.id), doc = await Attachment.findById(id);
  ensure(doc && (String(doc.ownerId) === req.auth!.userId || await Entry.exists({ attachmentId: id, businessId: req.auth!.business._id })), 404, 'Image not found.');
  await serveAsset(doc.asset, res);
});
media.get('/user/:id/:target', async (req, res) => {
  const id = objectId.parse(req.params.id), target = z.enum(['profile', 'upiQr']).parse(req.params.target);
  ensure(id === req.auth!.userId || await Customer.exists({ businessId: req.auth!.business._id, linkedUserId: id }), 404, 'Profile not found.');
  const doc = target === 'profile' ? await User.findById(id) : await Business.findOne({ ownerId: id });
  await serveAsset(doc?.[target === 'profile' ? 'photo' : 'upiQr'], res);
});
media.get('/:target', async (req, res) => {
  const target = z.enum(['profile', 'logo', 'upiQr', 'customer']).parse(req.params.target); setup();
  let asset;
  if (target === 'customer') {
    const customerId = objectId.parse(req.query.customerId);
    const customer = await Customer.findOne({ _id: customerId, businessId: req.auth!.business._id });
    ensure(customer, 404, 'Customer not found.');
    asset = customer.photo;
  } else {
    const doc = target === 'profile' ? await User.findById(req.auth!.userId) : req.auth!.business;
    asset = doc[target === 'profile' ? 'photo' : target === 'upiQr' ? 'upiQr' : 'logo'];
  }
  ensure(asset?.publicId, 404, 'No image found.');
  await serveAsset(asset, res);
});
media.delete('/:target', async (req, res) => {
  const target = z.enum(['profile', 'logo', 'upiQr', 'customer']).parse(req.params.target); setup();
  if (target === 'customer') {
    const customerId = objectId.parse(req.query.customerId);
    const doc = await Customer.findOne({ _id: customerId, businessId: req.auth!.business._id });
    ensure(doc, 404, 'Customer not found.');
    if (doc?.photo?.publicId) await cloudinary.uploader.destroy(doc.photo.publicId, { type: 'authenticated', invalidate: true });
    await Customer.updateOne({ _id: customerId }, { $unset: { photo: 1 } });
    return res.json({ ok: true });
  }
  const model = target === 'profile' ? User : Business, field = target === 'profile' ? 'photo' : target === 'upiQr' ? 'upiQr' : 'logo', id = target === 'profile' ? req.auth!.userId : req.auth!.business._id;
  const doc = await model.findById(id);
  if (doc?.[field]?.publicId) await cloudinary.uploader.destroy(doc[field].publicId, { type: 'authenticated', invalidate: true });
  await model.updateOne({ _id: id }, { $unset: { [field]: 1 } }); res.json({ ok: true });
});

export async function compressImage(input: Buffer, target: string) {
  const size = target === 'attachment' ? 1600 : target === 'upiQr' ? 1200 : 768;
  const pipeline = sharp(input, { limitInputPixels: 20_000_000, animated: false }).rotate().resize(size, size, { fit: 'inside', withoutEnlargement: true });
  // Lossless QR preserves scanner edges; photos use a smaller perceptual encode.
  return pipeline.webp(target === 'upiQr' ? { lossless: true, effort: 6 } : { quality: target === 'attachment' ? 76 : 78, effort: 6 }).toBuffer();
}
async function serveAsset(asset: any, res: import('express').Response) {
  setup(); ensure(asset?.publicId, 404, 'No image found.');
  const url = cloudinary.url(asset.publicId, { type: 'authenticated', secure: true, sign_url: true, version: asset.version });
  const response = await fetch(url, { signal: AbortSignal.timeout(15000) }); ensure(response.ok, 502, 'Image unavailable.');
  res.set('Content-Type', 'image/webp').set('Cache-Control', 'private, no-store').send(Buffer.from(await response.arrayBuffer()));
}
