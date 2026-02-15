import express, { Router } from 'express';
import { speechToText, textToSpeech } from '../services/elevenlabs.js';
import { answerPatientQuestion } from '../services/gemini.js';

export const voiceQaRouter = Router();

/**
 * Transcribe audio to text (ElevenLabs STT).
 * POST /api/voice-qa/transcribe
 * Body: raw audio binary (audio/webm from MediaRecorder)
 * Content-Type: audio/webm
 */
voiceQaRouter.post('/transcribe', express.raw({ type: ['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/webm;codecs=opus'], limit: '10mb' }), async (req, res) => {
  try {
    const audioBuffer = req.body;
    if (!audioBuffer?.length) {
      return res.status(400).json({ error: 'No audio data' });
    }
    const text = await speechToText(Buffer.from(audioBuffer), req.headers['content-type'] || 'audio/webm');
    res.json({ text });
  } catch (e) {
    console.error('[voice-qa/transcribe]', e.message);
    res.status(500).json({ error: e.message || 'Transcription failed' });
  }
});

/**
 * Answer a question about the current patient and return TTS audio.
 * POST /api/voice-qa/answer
 * Body: { question: string, patientContent: string }
 */
voiceQaRouter.post('/answer', async (req, res) => {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/3d69c74c-0a08-469c-8865-cd53c1d488d7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'voiceQa.js:answerEntry',message:'answer route hit',data:{hasBody:!!req.body,questionLen:req.body?.question?.length,hasContent:!!req.body?.patientContent},timestamp:Date.now(),hypothesisId:'H3'})}).catch(()=>{});
  // #endregion
  try {
    const { question, patientContent } = req.body;
    if (!question || typeof question !== 'string') {
      return res.status(400).json({ error: 'question required' });
    }
    const answer = await answerPatientQuestion(question, patientContent || '');
    let audioBase64 = null;
    try {
      const audioBuffer = await textToSpeech(answer.slice(0, 2500));
      audioBase64 = audioBuffer.toString('base64');
    } catch (e) {
      console.warn('[voice-qa/answer] ElevenLabs TTS:', e.message);
    }
    res.json({ answer, audioBase64 });
  } catch (e) {
    console.error('[voice-qa/answer]', e.message);
    res.status(500).json({ answer: e.message || 'Answer failed', error: e.message });
  }
});
