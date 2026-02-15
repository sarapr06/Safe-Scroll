import { constants } from 'crypto';
import { createSecureContext } from 'tls';
import { MongoClient } from 'mongodb';

let client;
let db;

export async function connectDb() {
  const uri = process.env.MONGODB_URI_STANDARD || process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI required in backend/.env. Copy .env.example to .env and add your Atlas connection string.');
  const options = {
    autoSelectFamily: false,
    serverSelectionTimeoutMS: 20000,
  };
  try {
    const ctx = createSecureContext({
      secureOptions: constants.SSL_OP_LEGACY_SERVER_CONNECT,
    });
    if (ctx) options.secureContext = ctx;
  } catch (_) {}
  if (process.env.MONGODB_TLS_INSECURE === 'true') {
    options.tlsAllowInvalidCertificates = true;
  }
  let lastErr;
  const urisToTry = [
    ...(process.env.MONGODB_URI_STANDARD ? [process.env.MONGODB_URI_STANDARD] : []),
    process.env.MONGODB_URI,
  ].filter(Boolean);
  const seen = new Set();
  for (const u of urisToTry) {
    if (seen.has(u)) continue;
    seen.add(u);
    try {
      client = new MongoClient(u, options);
      await client.connect();
      db = client.db();
      return db;
    } catch (e) {
      lastErr = e;
      if (client) try { await client.close(); } catch (_) {}
      client = null;
      db = null;
    }
  }
  throw lastErr;
}

export function getDb() {
  if (!db) throw new Error('Database not connected');
  return db;
}

export function isDbConnected() {
  return !!db;
}

export function getCollection(name) {
  return getDb().collection(name);
}
