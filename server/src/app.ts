import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import path from 'node:path';
import { ZodError } from 'zod';
import { createAuthRouter } from './auth.js';
import { workspace } from './workspace.js';
import { media } from './media.js';
import { config } from './config.js';
import { HttpError, rate, sameOrigin } from './security.js';
export function createApp(options: { verifyGoogle?: Parameters<typeof createAuthRouter>[0] } = {}) {
  const app = express(); app.disable('x-powered-by');
  app.use(helmet({ crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' }, contentSecurityPolicy: { directives: { 'img-src': ["'self'", 'data:', 'blob:'], 'connect-src': ["'self'", 'https://*.googleapis.com', 'https://*.firebaseapp.com', 'https://*.firebaseio.com'], 'frame-src': ['https://*.firebaseapp.com'], 'style-src': ["'self'", "'unsafe-inline'"] } } }));
  app.use(express.json({ limit: '100kb' }), cookieParser());
  app.use('/api', (_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
  app.use('/api', (req, res, next) => {
    const origin = req.headers.origin;
    const allowed = origin === config.origin || (!config.production && (['http://localhost:5173', 'http://127.0.0.1:5173'].includes(origin || '') || /^http:\/\/(?:[0-9]{1,3}\.){3}[0-9]{1,3}:\d+$/.test(origin || '')));
    if (allowed && origin) {
      res.set('Access-Control-Allow-Origin', origin);
      res.set('Access-Control-Allow-Credentials', 'true');
      res.set('Access-Control-Allow-Headers', 'Content-Type, X-CSRF-Token');
      res.set('Access-Control-Expose-Headers', 'X-CSRF-Token');
      res.set('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
    }
    if (req.cookies['okkhata_csrf']) {
      res.set('X-CSRF-Token', req.cookies['okkhata_csrf']);
    }
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });
  app.use('/api', sameOrigin, rate('global', 240));
  app.get('/api/health', (_req, res) => res.json({ status: 'ok', mode: config.localMailDir ? 'local-development' : 'connected' }));
  app.use('/api/v1/auth', createAuthRouter(options.verifyGoogle)); app.use('/api/v1/media', media); app.use('/api/v1', workspace);
  app.use('/api', (_req, res) => res.status(404).json({ error: 'This endpoint does not exist.' }));
  if (config.production) {
    const dist = path.resolve(process.cwd(), process.cwd().endsWith('server') ? '../client/dist' : 'client/dist');
    app.use(express.static(dist)); app.get('/{*path}', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
  }
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (err instanceof ZodError) return res.status(400).json({ error: err.issues[0]?.message || 'Invalid request.', fields: err.flatten().fieldErrors });
    if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
    if (err?.code === 11000) return res.status(409).json({ error: 'This record or request already exists. Refresh and try again.' });
    if (err?.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ error: 'Choose an image smaller than 5 MB.' });
    // No request bodies, secrets, tokens, or internal traces in API errors.
    console.error('Request failed:', err?.name || 'Error');
    return res.status(500).json({ error: 'The operation could not be completed. Please try again.' });
  });
  return app;
}
