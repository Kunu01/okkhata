# OkKhata deployment

## GitHub

Push this repository to GitHub and connect the same repository to both Vercel and Render. Keep `.env` and service-account JSON files out of Git; only commit `.env.example` files.

## Render API

Create the Render web service from `render.yaml` (or use the repository root manually). Set:

- `MONGODB_URI`: your MongoDB Atlas connection string with a replica set capable of transactions.
- `APP_ORIGIN`: the exact HTTPS Vercel URL, such as `https://okkhata.vercel.app`.
- `OTP_SECRET`: a random secret of at least 32 characters.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`: your personal mailbox SMTP details. For Gmail, use the mailbox address and an app password, never the normal account password.
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`: your Cloudinary credentials.

Render listens on `0.0.0.0` and exposes `/api/health` for health checks. Production cookies use `SameSite=None; Secure` so the Vercel client can securely call the Render API.

## Vercel client

Set the Vercel project root to the repository root and use the checked-in `vercel.json`. Add the environment variable `VITE_API_URL` with the Render API URL, for example `https://okkhata-api.onrender.com`, then redeploy. The client sends credentialed requests to that URL.

After both deployments, set Render `APP_ORIGIN` to the final Vercel domain and test Google signup, mobile login with email OTP, profile changes, and a UPI payment request. If the Vercel domain changes, update `APP_ORIGIN` and Firebase authorized domains before testing again.

## Firebase Google sign-in

Set `FIREBASE_PROJECT_ID` on the server. Provide a service account from the same Firebase project using either:

- `FIREBASE_SERVICE_ACCOUNT_JSON`: the complete service account JSON in the hosting platform's secret environment settings, or
- `GOOGLE_APPLICATION_CREDENTIALS`: the path to a private service account file available on the server. Local development uses `.local/firebase-service-account.json`. Ensure Windows has not added a second `.json` extension.

Set `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_PROJECT_ID`, and `VITE_FIREBASE_AUTH_DOMAIN` on the client, then rebuild it. Never use `VITE_` for service-account credentials. Enable the Google provider in Firebase Authentication and authorize each actual app hostname. Local development uses `localhost` and `127.0.0.1`; authorize the deployed Vercel/custom hostname separately. Keep popup permission enabled. The server verifies Firebase signatures, the project, expiry, provider, verified email, disabled accounts, and token revocation.

The popup SDK loads before the sign-in tap. Production Express responses use `Cross-Origin-Opener-Policy: same-origin-allow-popups` so OAuth popup communication remains available. See [Firebase Google sign-in](https://firebase.google.com/docs/auth/web/google-signin) and [server token verification](https://firebase.google.com/docs/auth/admin/verify-id-tokens).

## Account and ledger behavior

- New accounts require Google first, followed by a unique Indian mobile number. The Google email is bound to that number. Email/password signup and password login endpoints are retired. Existing verified accounts can sign in with mobile/email OTP, or Google with the same verified email to link their identity.
- OTPs go to the bound email, not SMS. A mobile number is a login identifier, not proof of phone ownership. Contacts connect by that registered number; use the correct number when creating a shared account.
- Changing a contact requires the current inbox's OTP; email changes also verify the new inbox. Both contacts share a seven-day cooldown. Limits use a rolling 365-day window: two email changes and one mobile change. Changes revoke other app sessions and preserve the existing Google identity and shared account links.
- A registered contact gets a reciprocal customer account. Each entry is mirrored atomically with the opposite balance change, original author, attachment, and timestamp. Only the author can reverse an entry. Historical entries are connected when the recipient joins and loads the workspace. Both parties' pre-existing entries remain separate events; do not enter the same payment again on both accounts.
- The workspace refreshes every 30 seconds and on focus. This is polling, not a live chat socket. Customer/entry queries remain scoped to the signed-in participant.
- UPI ID and QR settings are available in My profile. A debtor can open the other person's UPI link; a creditor can display their own payment QR. UPI settlement is **manually confirmed**; opening or generating a QR never verifies a bank transfer. Static QR-only payments can be entered with the normal payment action after checking the UPI result.
- New entries collect date and time. History and exports show IST. Existing date-only records retain their stored timestamps; actual historical times cannot be reconstructed.
- Reading size defaults to 125%, with settings up to 250%. Large type uses a navigation drawer. Smartphone customer lists reflow into cards; wide transaction tables scroll within their panel.
- Photos are resized and compressed before upload, then re-encoded and stripped of metadata on the server. Profiles use WebP up to 768px; attachments up to 1600px. QR codes use lossless WebP up to 1200px. Media and attachments are available only to authorized accounts.

## Validation

Run `npm test` for isolated MongoDB replica-set integration tests and calculator/image tests. Run `npm run build` for client and server production builds. Tests inject Google identities only into the test app factory; production always uses Firebase verification. Tests never use the configured production database or send live mail.
