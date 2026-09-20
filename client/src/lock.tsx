import { useState } from 'react';
import { ArrowRight, LogOut, KeyRound } from 'lucide-react';
import { post } from './api';

export function LockScreen({ userId, name, onUnlock, onLogout }: { userId: string; name: string; onUnlock: () => void; onLogout: () => Promise<void> }) {
  const [pin, setPin] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const [step, setStep] = useState<'unlock' | 'otp' | 'new-passcode'>('unlock');
  const [challenge, setChallenge] = useState<any>(null);
  const [otp, setOtp] = useState('');

  const unlock = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setError('');
    try {
      await post('/auth/unlock', { passcode: pin });
      onUnlock();
    } catch (err) { setError((err as Error).message); setPin(''); } finally { setBusy(false); }
  };

  const requestForgot = async () => {
    setBusy(true); setError('');
    try {
      const res = await post('/auth/passcode/forgot-request');
      setChallenge(res);
      setStep('otp');
    } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  };

  const verifyOtpAndSetPasscode = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setError('');
    try {
      await post('/auth/passcode/forgot-verify', { challengeId: challenge.challengeId, continuation: challenge.continuation, code: otp, newPasscode: pin });
      onUnlock();
    } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  };

  if (step === 'otp' || step === 'new-passcode') {
    return <main className="lock-page"><div className="lock-card"><img src="/icon.svg" alt="OkKhata"/>
      <h1>Reset passcode</h1>
      <p>{step === 'otp' ? challenge?.message || 'Enter the 6-digit code sent to your email.' : 'Enter your new 4-6 digit passcode.'}</p>
      <form onSubmit={step === 'otp' ? (e) => { e.preventDefault(); setStep('new-passcode'); setPin(''); } : verifyOtpAndSetPasscode}>
        {step === 'otp' ? 
          <input className="pin-input" aria-label="OTP" type="text" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} minLength={6} value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ''))} autoFocus required/>
        :
          <><input className="pin-input" aria-label="New passcode" type="password" inputMode="none" pattern="[0-9]{4,6}" maxLength={6} minLength={4} value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ''))} autoFocus required/>
          <div className="pin-keypad">{['1','2','3','4','5','6','7','8','9','Clear','0','⌫'].map(v => <button key={v} type="button" onClick={() => setPin(old => v === 'Clear' ? '' : v === '⌫' ? old.slice(0, -1) : (old + v).slice(0, 6))}>{v}</button>)}</div></>
        }
        {error && <div className="form-error">{error}</div>}
        <button className="button primary full" disabled={busy}>{step === 'otp' ? 'Continue' : 'Save and Unlock'}<ArrowRight size={17}/></button>
      </form>
      <div className="lock-actions">
        <button type="button" className="text-button" onClick={() => { setStep('unlock'); setPin(''); setOtp(''); setError(''); }}>Cancel</button>
      </div>
    </div></main>;
  }

  return <main className="lock-page"><div className="lock-card"><img src="/icon.svg" alt="OkKhata"/>
    <h1>Welcome back, {name.split(' ')[0]}.</h1>
    <p>Enter your passcode to open your khata.</p>
    <form onSubmit={unlock}>
      <input className="pin-input" aria-label="App passcode" type="password" inputMode="none" pattern="[0-9]{4,6}" maxLength={6} minLength={4} value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ''))} autoFocus required/>
      <div className="pin-keypad">{['1','2','3','4','5','6','7','8','9','Clear','0','⌫'].map(v => <button key={v} type="button" onClick={() => setPin(old => v === 'Clear' ? '' : v === '⌫' ? old.slice(0, -1) : (old + v).slice(0, 6))}>{v}</button>)}</div>
      {error && <div className="form-error">{error}</div>}
      <button className="button primary full" disabled={busy}>{busy ? 'Unlocking…' : 'Unlock your khata'}<ArrowRight size={17}/></button>
    </form>
    <div className="lock-actions" style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginTop: '1rem' }}>
      <button type="button" className="text-button" onClick={requestForgot} disabled={busy}><KeyRound size={15}/>Forgot passcode?</button>
      <button type="button" className="text-button danger" onClick={async () => { try { await onLogout(); } catch { setError('Reconnect to sign out securely.'); } }}><LogOut size={15}/>Sign out</button>
    </div>
  </div></main>;
}

