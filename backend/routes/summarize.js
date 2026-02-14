import { Router } from 'express';
import { summarizePatientFile } from '../services/gemini.js';
import { textToSpeech } from '../services/elevenlabs.js';
import { getCollection } from '../db.js';

export const summarizeRouter = Router();

summarizeRouter.post('/', async (req, res) => {
  try {
    const { fileId, content } = req.body;
    const text = content || (fileId && await getFileContent(fileId));
    if (!text) return res.status(400).json({ error: 'content or fileId required' });

    const summary = await summarizePatientFile(text);
    const verbalSummary = summary.verbalSummary || summary.keyFindings?.join('. ') || 'No summary.';

    let audioBase64 = null;
    try {
      const audioBuffer = await textToSpeech(verbalSummary);
      audioBase64 = audioBuffer.toString('base64');
    } catch (e) {
      console.warn('ElevenLabs error:', e.message);
    }

    res.json({ summary, audioBase64 });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

async function getFileContent(fileId) {
  const { ObjectId } = await import('mongodb');
  const file = await getCollection('patient_files').findOne({
    _id: new ObjectId(fileId),
  });
  return file?.content || file?.text || null;
}
