import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';

let client;

function getClient() {
  if (!client) {
    const key = process.env.ELEVENLABS_API_KEY;
    if (!key) throw new Error('ELEVENLABS_API_KEY required');
    client = new ElevenLabsClient({ apiKey: key });
  }
  return client;
}

export async function textToSpeech(text) {
  const eleven = getClient();
  const stream = await eleven.textToSpeech.convert('21m00Tcm4TlvDq8ikWAM', {
    text,
    model_id: 'eleven_multilingual_v2',
  });
  if (!stream || typeof stream.getReader !== 'function') {
    throw new Error('ElevenLabs returned invalid stream');
  }
  const reader = stream.getReader();
  const chunks = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }
  return Buffer.concat(chunks);
}

/**
 * Transcribe audio to text using ElevenLabs Speech-to-Text.
 * @param {Buffer} audioBuffer - Raw audio (e.g. webm from MediaRecorder)
 * @param {string} [mimeType] - e.g. 'audio/webm'
 * @returns {Promise<string>} Transcript text
 */
export async function speechToText(audioBuffer, mimeType = 'audio/webm') {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) throw new Error('ELEVENLABS_API_KEY required');

  const form = new FormData();
  form.append('model_id', 'scribe_v2');
  form.append('file', new Blob([audioBuffer], { type: mimeType }), 'recording.webm');

  const res = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
    method: 'POST',
    headers: { 'xi-api-key': key },
    body: form,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.detail?.message || json.message || json.detail || `ElevenLabs STT ${res.status}`);

  let text = json.text ?? json.transcript ?? json.transcripts?.[0]?.text ?? '';
  if (!text && Array.isArray(json.words)) {
    text = json.words.map((w) => w?.text).filter(Boolean).join(' ');
  }
  return String(text).trim() || '';
}
