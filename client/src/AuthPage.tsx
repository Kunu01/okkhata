import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowRight, ArrowLeft, ShieldCheck } from 'lucide-react';
import { post } from './api';
import { googleToken } from './google';
export { googleToken } from './google';

export default function AuthPage({ signup = false }: { signup?: boolean }) {
  const [pending, setPending] = useState<any>(null), [challenge, setChallenge] = useState<any>(null);
  const [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const navigate = useNavigate(), cache = useQueryClient();
  const done = async () => { cache.removeQueries({ queryKey: ['workspace'] }); await cache.invalidateQueries({ queryKey: ['session'] }); navigate('/customers', { replace: true }); };
  const run = async (fn: () => Promise<void>) => { setBusy(true); setError(''); try { await fn(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); } };
  const google = () => void run(async () => { const result = await post('/auth/google', { token: await googleToken() }); if (result.needsMobile) setPending(result); else await done(); });
  return <div className="auth-layout" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}><main className="auth-main" style={{ width: '100%', maxWidth: '400px' }}><div className="auth-form"><span className="auth-icon"><ShieldCheck/></span><h2>{pending ? 'Complete signup' : challenge ? 'Enter code' : signup ? 'Create account' : 'Sign in'}</h2>
      {error && <div className="form-error" role="alert">{error}</div>}
      {pending ? <form onSubmit={e => { e.preventDefault(); const f = Object.fromEntries(new FormData(e.currentTarget)); void run(async () => { await post('/auth/google/complete', { challengeId: pending.challengeId, continuation: pending.continuation, ...f }); await done(); }); }}><label>Your name<input name="name" defaultValue={pending.name} required maxLength={80} autoComplete="name"/></label><label>Mobile number (+91)<input name="mobile" type="tel" defaultValue="+91 " placeholder="+91 98765 43210" autoComplete="tel" required/></label><label>Set a 4-6 digit passcode<input name="passcode" type="password" inputMode="numeric" pattern="[0-9]{4,6}" maxLength={6} minLength={4} placeholder="e.g. 1234" required/></label><button className="button primary full" disabled={busy}>Finish signup<ArrowRight size={17}/></button><button type="button" className="text-button" disabled={busy} onClick={() => setPending(null)}>Back</button></form>
      : challenge ? <form onSubmit={e => { e.preventDefault(); const f = Object.fromEntries(new FormData(e.currentTarget)); void run(async () => { await post('/auth/otp/verify', { ...challenge, ...f }); await done(); }); }}><label>Email code<input name="code" className="otp-input" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="one-time-code" required autoFocus/></label><button className="button primary full" disabled={busy}>Verify</button><button type="button" className="text-button" disabled={busy} onClick={() => void run(async () => setChallenge(await post('/auth/challenge/resend', challenge)))}>Resend code</button><button type="button" className="text-button" disabled={busy} onClick={() => setChallenge(null)}>Back</button></form>
      : <><button className="button primary full" disabled={busy} onClick={google}><span className="google-g">G</span>{busy ? 'Please wait…' : 'Continue with Google'}</button>{!signup && <><div className="divider"><span>or sign in with mobile</span></div><form onSubmit={e => { e.preventDefault(); const f = Object.fromEntries(new FormData(e.currentTarget)); void run(async () => setChallenge(await post('/auth/otp/request', f))); }}><label>Registered mobile (+91)<input name="mobile" type="tel" defaultValue="+91 " placeholder="+91 98765 43210" required autoComplete="tel"/></label><button className="button full" disabled={busy}>Send code<ArrowRight size={17}/></button></form></>}<p className="auth-switch">{signup ? 'Already registered?' : 'New to OkKhata?'} <Link to={signup ? '/login' : '/signup'}>{signup ? 'Sign in' : 'Sign up'}</Link></p></>}
    </div></main></div>;
}

