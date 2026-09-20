export class ApiError extends Error { constructor(message: string, public status: number) { super(message); } }
const apiBase = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
export async function api<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const csrf = document.cookie.split('; ').find(c => c.startsWith('okkhata_csrf='))?.split('=')[1] || sessionStorage.getItem('okkhata_csrf') || '';
  const response = await fetch(`${apiBase}/api/v1${path}`, { credentials: 'include', ...options, headers: { ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }), 'X-CSRF-Token': csrf, ...options.headers } });
  const responseCsrf = response.headers.get('X-CSRF-Token'); if (responseCsrf) sessionStorage.setItem('okkhata_csrf', responseCsrf);
  const result = await response.json().catch(() => ({ error: 'The server is unavailable. Please try again.' }));
  if (!response.ok) throw new ApiError(result.error || 'Something went wrong.', response.status);
  return result;
}
export const post = async <T = any>(path: string, body: unknown = {}) => {
  const result = await api<T>(path, { method: 'POST', body: JSON.stringify(body) });
  if (['/auth/logout', '/auth/login', '/auth/signup/verify', '/auth/otp/verify', '/auth/google', '/auth/google/complete', '/auth/password/reset'].includes(path) && 'BroadcastChannel' in window) {
    const channel = new BroadcastChannel('okkhata-auth'); channel.postMessage('session-changed'); channel.close();
  }
  return result;
};
export const patch = <T = any>(path: string, body: unknown) => api<T>(path, { method: 'PATCH', body: JSON.stringify(body) });
export const del = <T = any>(path: string) => api<T>(path, { method: 'DELETE' });
export const money = (minor: number, decimals = false) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: decimals ? 2 : (minor % 100 ? 2 : 0) }).format(minor / 100);
export const date = (value: string, full = false) => new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', ...(full ? { year: 'numeric' as const } : {}) });
export function toMinor(value: string) { if (!/^\d{1,9}(\.\d{1,2})?$/.test(value)) throw new Error('Enter a valid amount with up to two decimal places.'); const [whole, decimal = ''] = value.split('.'); return Number(whole) * 100 + Number(decimal.padEnd(2, '0')); }
export const initials = (name: string) => name.split(' ').filter(Boolean).slice(0, 2).map(s => s[0]).join('').toUpperCase();
export function downloadCsv(filename: string, rows: (string | number)[][]) {
  const escape = (v: string | number) => { let s = String(v); if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`; return `"${s.replaceAll('"', '""')}"`; };
  const url = URL.createObjectURL(new Blob(['\uFEFF', rows.map(row => row.map(escape).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const dateTime = (value: string) => new Date(value).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) + ' IST';
export const localDateTime = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16); };

export const indiaDate = (value: string) => new Date(value).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
