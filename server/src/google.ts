import path from 'node:path';
import fs from 'node:fs';
import { getApps, initializeApp, applicationDefault, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { ensure, HttpError } from './security.js';

export type GoogleIdentity = { uid: string; email: string; name?: string };
export async function googleIdentity(token: string): Promise<GoogleIdentity> {
  ensure(process.env.FIREBASE_PROJECT_ID, 503, 'Set FIREBASE_PROJECT_ID on the API server to enable Google sign-in.');
  if (!getApps().length) {
    let credential;
    try {
      if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) credential = cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON));
      else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        const file = process.env.GOOGLE_APPLICATION_CREDENTIALS;
        const resolved = path.resolve(process.cwd(), file);
        const rootRelative = path.resolve(process.cwd(), '..', file);
        credential = cert(JSON.parse(fs.readFileSync(fs.existsSync(resolved) ? resolved : rootRelative, 'utf8')));
      } else credential = applicationDefault();
      initializeApp({ credential, projectId: process.env.FIREBASE_PROJECT_ID });
    } catch { throw new HttpError(503, 'Google sign-in server credentials are unavailable. Configure a Firebase service account for this project.'); }
  }
  try {
    const identity = await getAuth().verifyIdToken(token, true);
    ensure(identity.firebase.sign_in_provider === 'google.com' && identity.email_verified && identity.email, 401, 'Use a verified Google account.');
    return { uid: identity.uid, email: identity.email.toLowerCase(), name: identity.name };
  } catch (err: any) {
    if (err instanceof HttpError) throw err;
    if (['auth/invalid-credential', 'app/invalid-credential', 'auth/insufficient-permission'].includes(err.code)) throw new HttpError(503, 'The Firebase server credentials need to be configured for this project.');
    throw new HttpError(401, `Google verification failed. Sign in with Google again. (${err.message})`);
  }
}
