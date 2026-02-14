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
