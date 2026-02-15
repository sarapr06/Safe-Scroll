import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import express from 'express';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '.env') });
import cors from 'cors';
import { createServer } from 'http';

import { initWs, broadcastGesture, getEsp8266SSEClients } from './ws.js';
import { gesturesRouter } from './routes/gestures.js';
import { filesRouter } from './routes/files.js';
import { imagingRouter } from './routes/imaging.js';
import { summarizeRouter } from './routes/summarize.js';
import { presageRouter } from './routes/presage.js';
import { fmriniiRouter } from './routes/fmrinii.js';
import { voiceQaRouter } from './routes/voiceQa.js';
import { connectDb } from './db.js';
import { seedPatientFmrinii } from './scripts/seedPatientFmrinii.js';
import { GEMINI_MODEL } from './services/gemini.js';

const app = express();
const server = createServer(app);
initWs(server);

app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json({ limit: '2mb' }));

app.use('/api/gestures', gesturesRouter);
app.use('/api/files', filesRouter);
app.use('/api/imaging', imagingRouter);
app.use('/api/summarize', summarizeRouter);
app.use('/api/presage', presageRouter);
app.use('/api/fmrinii', fmriniiRouter);
app.use('/api/voice-qa', voiceQaRouter);

app.get('/api/esp8266/stream', (req, res) => {
  const clients = getEsp8266SSEClients();
  clients.add(res);
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();
  req.on('close', () => clients.delete(res));
});

app.use((err, req, res, next) => {
  console.error('[Express error]', err?.message || err);
  if (!res.headersSent) res.status(500).json({ error: err?.message || 'Internal server error' });
});

app.get('/health', (req, res) => {
  res.json({ ok: true, geminiModel: GEMINI_MODEL });
});

app.get('/api/nifti-sample', async (req, res) => {
  const sampleUrl = 'https://nifti.nimh.nih.gov/nifti-1/data/avg152T1_LR_nifti.nii.gz';
  try {
    const r = await fetch(sampleUrl);
    if (!r.ok) throw new Error(`Upstream ${r.status}`);
    const buf = Buffer.from(await r.arrayBuffer());
    res.setHeader('Content-Type', 'application/gzip');
    res.setHeader('Content-Disposition', 'inline; filename=avg152T1_LR_nifti.nii.gz');
    res.send(buf);
  } catch (e) {
    res.status(500).json({ error: e?.message || 'Failed to fetch sample NIfTI' });
  }
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
    await seedPatientFmrinii();
  } catch (err) {
    console.warn('MongoDB not connected (files/summarize will fail):', err.message);
  }
}

main();
