// Explicit local-only adapter: real MongoDB replica set and a disk email mailbox.
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
if (process.env.NODE_ENV === 'production') throw new Error('The local adapter cannot run in production.');
const root = path.resolve(import.meta.dirname, '..');
const local = path.join(root, '.local'); await fs.mkdir(local, { recursive: true });
const mongo = await MongoMemoryReplSet.create({ replSet: { count: 1 }, binary: { downloadDir: path.join(local, 'mongo-binaries') } });
console.log('Local MongoDB ready. Data is temporary for this run. Development emails are written to .local/mail (never sent).');
const env = { ...process.env, NODE_ENV: 'development', MONGODB_URI: mongo.getUri('okkhata'), OTP_SECRET: randomBytes(48).toString('hex'), LOCAL_MAIL_DIR: path.join(local, 'mail') };
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const child = spawn(npm, ['run', 'dev'], { cwd: root, env, stdio: 'inherit', shell: process.platform === 'win32' });
const stop = async () => { child.kill(); await mongo.stop(); process.exit(0); };
process.on('SIGINT', stop); process.on('SIGTERM', stop); child.on('exit', stop);
