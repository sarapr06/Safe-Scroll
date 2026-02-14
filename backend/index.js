import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import express from 'express';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '.env') });
import cors from 'cors';
import { createServer } from 'http';

import { initWs, broadcastGesture } from './ws.js';
import { gesturesRouter } from './routes/gestures.js';
import { filesRouter } from './routes/files.js';
import { summarizeRouter } from './routes/summarize.js';
import { presageRouter } from './routes/presage.js';
import { connectDb } from './db.js';
import { GEMINI_MODEL } from './services/gemini.js';

const app = express();
const server = createServer(app);
initWs(server);

app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json());

app.use('/api/gestures', gesturesRouter);
app.use('/api/files', filesRouter);
app.use('/api/summarize', summarizeRouter);
app.use('/api/presage', presageRouter);

app.get('/health', (req, res) => {
  res.json({ ok: true, geminiModel: GEMINI_MODEL });
});

app.get('/api/gemini-test', async (req, res) => {
  const { summarizePatientFile } = await import('./services/gemini.js');
  try {
    const out = await summarizePatientFile('Test patient: John, BP 120/80, HR 72');
    res.json({ ok: true, summary: out });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message, stack: err.stack });
  }
});

async function main() {
  const port = process.env.PORT || 4000;
  // Start server first so WebSocket works even if MongoDB is slow/unavailable
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${port} is in use. Kill the other process: lsof -i :${port}`);
      process.exit(1);
    }
    throw err;
  });
  server.listen(port, () => {
    console.log(`Safe-Scroll backend running on http://localhost:${port}`);
    console.log(`Gemini: ${GEMINI_MODEL} (first of fallback list)`);
  });
  try {
    await connectDb();
  } catch (err) {
    console.warn('MongoDB not connected (files/summarize will fail):', err.message);
  }
}

main();
