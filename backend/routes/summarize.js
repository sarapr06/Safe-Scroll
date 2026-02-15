import { Router } from 'express';
import { summarizePatientFile, summarizePatientFilesBatch } from '../services/gemini.js';
import { textToSpeech } from '../services/elevenlabs.js';
import { getCollection } from '../db.js';

export const summarizeRouter = Router();

/** Single-file summarize (legacy / manual) */
summarizeRouter.post('/', async (req, res) => {
  try {
    const { fileId, content } = req.body;
    const text = content || (fileId && (await getFileContent(fileId)));
    if (!text) return res.status(400).json({ error: 'content or fileId required' });

    const summary = await summarizePatientFile(text);
    const verbalSummary = summary.verbalSummary || summary.keyFindings?.join('. ') || 'No summary.';

    let audioBase64 = null;
    try {
      const audioBuffer = await textToSpeech(verbalSummary);
      audioBase64 = audioBuffer.toString('base64');
    } catch {
      /* ElevenLabs failed; audio omitted, UI uses speechSynthesis */
    }

    res.json({ summary, audioBase64 });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * Batch summarize all files in one Gemini call.
 * Body: { files: [{ id, content }] }
 * Returns: { summaries: { [id]: { summary, keyFindings, ... } } }
 * Audio is not included; use POST /audio for on-demand TTS.
 */
summarizeRouter.post('/batch', async (req, res) => {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/3d69c74c-0a08-469c-8865-cd53c1d488d7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'summarize.js:batchEntry',message:'batch route hit',data:{fileCount:req.body?.files?.length},timestamp:Date.now(),hypothesisId:'H1'})}).catch(()=>{});
  // #endregion
  try {
    const { files } = req.body;
    if (!Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ error: 'files array required' });
    }
    const withContent = files.map((f) => ({
      id: f.id ?? f._id,
      content: f.content ?? f.text ?? '',
    }));
    const summaries = await summarizePatientFilesBatch(withContent);
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/3d69c74c-0a08-469c-8865-cd53c1d488d7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'summarize.js:batchSuccess',message:'batch gemini done',data:{summaryKeys:Object.keys(summaries||{})},timestamp:Date.now(),hypothesisId:'H2'})}).catch(()=>{});
    // #endregion
    res.json({ summaries });
  } catch (e) {
    const errMsg = e?.message || String(e);
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/3d69c74c-0a08-469c-8865-cd53c1d488d7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'summarize.js:batchError',message:'batch failed',data:{err:errMsg},timestamp:Date.now(),hypothesisId:'H1'})}).catch(()=>{});
    // #endregion
    console.error('[summarize/batch]', errMsg);
    res.status(500).json({ error: errMsg });
  }
});

/**
 * Generate TTS audio for a summary (lazy, on play).
 * Body: { text } - the verbal summary or text to speak
 */
summarizeRouter.post('/audio', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'text required' });
    }
    const audioBuffer = await textToSpeech(text.slice(0, 2500));
    res.json({ audioBase64: audioBuffer.toString('base64') });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

async function getFileContent(fileId) {
  const { ObjectId } = await import('mongodb');
  try {
    const file = await getCollection('patient_files').findOne({
      _id: typeof fileId === 'string' && fileId.length === 24 ? new ObjectId(fileId) : fileId,
    });
    return file?.content || file?.text || null;
  } catch {
    return null;
  }
}
