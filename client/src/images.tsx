import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { api } from './api';

export const mediaUrl = (url?: string) => url?.startsWith('/api/') ? `${(import.meta.env.VITE_API_URL || '').replace(/\/$/, '')}${url}` : url;

export async function compressPhoto(file: File, qr = false) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Choose a JPEG, PNG or WebP image.');
  if (file.size > 20 * 1024 * 1024) throw new Error('Choose an image smaller than 20 MB.');
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  try {
    const scale = Math.min(1, (qr ? 1200 : 1600) / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(bitmap.width * scale)); canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('Image compression is unavailable in this browser.');
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error('Could not compress this image.')), qr ? 'image/png' : 'image/webp', .8));
    if (blob.size > 5 * 1024 * 1024) throw new Error('This image is still too large. Choose a smaller image.');
    return new File([blob], qr ? 'qr.png' : 'photo.webp', { type: blob.type });
  } finally { bitmap.close(); }
}

export function PhotoViewer({ src, name, onClose }: { src: string; name: string; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { ref.current?.showModal(); }, []);
  return createPortal(<dialog ref={ref} className="photo-viewer" onCancel={onClose} onClick={e => { e.stopPropagation(); if (e.target === e.currentTarget) onClose(); }}><button className="icon-button" autoFocus aria-label="Close photo" onClick={onClose}><X/></button><img crossOrigin="use-credentials" src={mediaUrl(src)} alt={name}/><p>{name}</p></dialog>, document.body);
}

export function EntryAttachment() {
  const [id, setId] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState('');
  return <label data-uploading={busy}>Photo attachment (optional)<input type="hidden" name="attachmentId" value={id}/><input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={async e => {
    const file = e.target.files?.[0]; if (!file) return; setBusy(true); setError(''); setId('');
    try { const body = new FormData(); body.append('image', await compressPhoto(file)); const result = await api('/media/attachment', { method: 'POST', body }); setId(result.attachmentId); }
    catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  }}/><small>{busy ? 'Compressing and uploading…' : id ? 'Photo ready. It will be shared with this entry.' : 'Photos are compressed before upload.'}</small>{error && <span className="form-error" role="alert">{error}</span>}</label>;
}
