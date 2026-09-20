import { getApps, initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';

// Load before the tap so opening the popup retains the browser's user gesture.
export async function googleToken() {
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY, projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
  if (!apiKey || !projectId) throw new Error('Set the client Firebase API key and project ID to enable Google sign-in.');
  const app = getApps()[0] || initializeApp({ apiKey, projectId, authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || `${projectId}.firebaseapp.com` });
  const auth = getAuth(app), provider = new GoogleAuthProvider(); provider.setCustomParameters({ prompt: 'select_account' });
  try {
    const result = await signInWithPopup(auth, provider);
    const token = await result.user.getIdToken(true);
    await signOut(auth);
    return token;
  } catch (err: any) {
    const messages: Record<string, string> = {
      'auth/unauthorized-domain': `Add ${location.hostname} to Firebase Authentication → Settings → Authorized domains.`,
      'auth/operation-not-allowed': 'Enable Google in Firebase Authentication → Sign-in method.',
      'auth/popup-blocked': 'Allow sign-in popups for this site, then tap Continue with Google again.',
      'auth/popup-closed-by-user': 'Google sign-in was closed. Tap Continue with Google to try again.',
      'auth/cancelled-popup-request': 'A Google sign-in window is already open.',
      'auth/network-request-failed': 'Unable to reach Google. Check your connection and try again.',
      'auth/invalid-api-key': 'The Firebase web API key is invalid. Check the client configuration.',
    };
    throw new Error(messages[err.code] || 'Google sign-in failed. Please try again.');
  }
}
