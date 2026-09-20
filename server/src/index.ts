import dns from 'node:dns';
import mongoose from 'mongoose';
import { createApp } from './app.js';
import { config, checkConfig } from './config.js';
import { models } from './models.js';
try { dns.setServers(['8.8.8.8', '8.8.4.4']); } catch {}
checkConfig();
await mongoose.connect(config.mongo);
await Promise.all(models.map(model => model.init()));
const server = createApp().listen(config.port, config.host, () => console.log(`OkKhata API ready on ${config.host}:${config.port}`));
const shutdown = async () => { server.close(); await mongoose.disconnect(); process.exit(0); };
process.on('SIGTERM', shutdown); process.on('SIGINT', shutdown);
