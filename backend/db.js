import { MongoClient } from 'mongodb';

let client;
let db;

export async function connectDb() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI required');
  client = new MongoClient(uri);
  await client.connect();
  db = client.db();
  return db;
}

export function getDb() {
  if (!db) throw new Error('Database not connected');
  return db;
}

export function getCollection(name) {
  return getDb().collection(name);
}
