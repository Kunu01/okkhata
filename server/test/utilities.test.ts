import { test } from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { calculateAmount } from '../../client/src/calculator.js';
import { newId } from '../../client/src/id.js';
import { compressImage } from '../src/media.js';

test('entry idempotency keys remain unique UUIDs when a phone browser lacks randomUUID', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis.crypto, 'randomUUID');
  Object.defineProperty(globalThis.crypto, 'randomUUID', { configurable: true, value: undefined });
  try {
    const keys = Array.from({ length: 100 }, () => newId());
    assert.equal(new Set(keys).size, 100);
    for (const key of keys) assert.match(key, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  } finally {
    if (original) Object.defineProperty(globalThis.crypto, 'randomUUID', original);
    else Reflect.deleteProperty(globalThis.crypto, 'randomUUID');
  }
});

test('calculator precedence, percentages, decimal arithmetic and invalid input', () => {
  for (const [expression, expected] of [['200+10%', 220], ['200-10%', 180], ['200*10%', 20], ['200/10%', 2000], ['2+3*4', 14], ['(2+3)*4', 20], ['.1+.2', .3], ['1.005', 1.01], ['100+10%+10%', 121], ['10/4', 2.5], ['-2+5', 3], ['100000000', 100000000]] as const) assert.equal(calculateAmount(expression), expected, expression);
  for (const expression of ['', '1/0', '1..2', '1+', '()', '(2+3', '2**3', 'alert(1)', '1;2', '-1', '0', '100000001', '1%%']) assert.throws(() => calculateAmount(expression), undefined, expression);
});

test('photo compression limits dimensions, strips metadata and preserves lossless QR pixels', async () => {
  const input = await sharp({ create: { width: 2400, height: 1800, channels: 3, background: '#639782' } }).jpeg({ quality: 100 }).withMetadata({ orientation: 6 }).toBuffer();
  const photo = await compressImage(input, 'profile'), meta = await sharp(photo).metadata();
  assert.equal(meta.format, 'webp'); assert.ok(meta.width! <= 768 && meta.height! <= 768); assert.equal(meta.exif, undefined); assert.ok(photo.length < input.length);
  const qr = await sharp({ create: { width: 300, height: 300, channels: 3, background: '#fff' } }).composite([{ input: Buffer.from('<svg width="150" height="150"><rect width="150" height="150" fill="black"/></svg>'), left: 0, top: 0 }]).png().toBuffer();
  assert.deepEqual(await sharp(await compressImage(qr, 'upiQr')).removeAlpha().raw().toBuffer(), await sharp(qr).removeAlpha().raw().toBuffer());
});
