import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env') });

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
// Models that support generateContent; order by availability (add gemini-exp/gemma for keys with limited access)
const MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-pro',
  'gemini-2.0-flash',
  'gemini-2.0-flash-001',
  'gemini-2.0-flash-lite',
  'gemini-2.0-flash-lite-001',
  'gemini-exp-1206',
  'gemma-3-12b-it',
  'gemma-3-4b-it',
  'gemma-3-1b-it',
];
export const GEMINI_MODEL = process.env.GEMINI_MODEL || MODELS[0];

async function callGeminiREST(model, prompt) {
  if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not set in .env');
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error?.message || JSON.stringify(json));
  const parts = json.candidates?.[0]?.content?.parts ?? [];
  const text = parts.map((p) => p?.text).filter(Boolean).join('');
  if (!text) throw new Error('No content in response');
  return text;
}

export async function summarizePatientFile(content) {
  const prompt = `You are a medical assistant. Analyze this patient file and extract:
1. Key findings (2-4 bullet points)
2. Abnormal vitals or lab values (highlight if any)
3. Core metrics (HR, BP, temp, etc.) in a brief table format
4. A 2-3 sentence clinical summary for verbal readout

Output ONLY valid JSON, no markdown or code blocks. Schema:
{
  "keyFindings": ["string"],
  "abnormalVitals": ["string"],
  "coreMetrics": { "heartRate": "string", "bloodPressure": "string" },
  "verbalSummary": "string"
}

Patient file content:
---
${content}
---`;

  function parseJsonResponse(text) {
    if (!text) throw new Error('Empty response');
    let str = String(text).trim();
    // Extract from ```json ... ``` block if present (flexible backtick match)
    const codeBlockMatch = str.match(/[`\uFF40]{3,}\s*json\s*([\s\S]*?)\s*[`\uFF40]{3,}/i);
    if (codeBlockMatch) str = codeBlockMatch[1].trim();
    // Strip any remaining leading/trailing markdown
    str = str.replace(/^[\s]*[`\uFF40]{3,}\s*json?\s*/gi, '').replace(/\s*[`\uFF40]{3,}\s*$/g, '').trim();
    // Safety: strip any leading backticks (invalid in JSON)
    str = str.replace(/^[`\uFF40\s]+/, '').trim();
    // Extract JSON object from first { to last }
    const start = str.indexOf('{');
    const end = str.lastIndexOf('}');
    if (start >= 0 && end > start) str = str.slice(start, end + 1);
    try {
      return JSON.parse(str);
    } catch (e) {
      throw new Error(`JSON parse failed. Raw: ${str.slice(0, 300)}`);
    }
  }

  const callGemini = async (model = GEMINI_MODEL) => {
    const rawText = await callGeminiREST(model, prompt);
    return parseJsonResponse(rawText);
  };

  for (const model of MODELS) {
    try {
      const result = await callGemini(model);
      if (model !== GEMINI_MODEL) console.log(`[Gemini] Used fallback model: ${model}`);
      return result;
    } catch (error) {
      const msg = error.message || String(error);
      const isQuota = msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('quota');
      const isNotFound = msg.includes('404') || msg.toLowerCase().includes('not found');
      const isLast = model === MODELS[MODELS.length - 1];
      if (isNotFound && !isLast) {
        console.warn(`[Gemini] ${model} not available, trying next model...`);
        continue;
      }
      if (isQuota && !isLast) {
        console.warn(`[Gemini] ${model} quota exceeded, trying next model...`);
        continue;
      }
      const isDailyExhausted = msg.includes('limit: 0');
      if (isQuota && msg.includes('retry') && !isDailyExhausted) {
        const match = msg.match(/retry in (\d+(?:\.\d+)?)s/);
        const waitSec = match ? Math.ceil(parseFloat(match[1])) + 2 : 60;
        console.warn(`[Gemini] Quota exceeded. Retrying in ${waitSec}s...`);
        await new Promise((r) => setTimeout(r, waitSec * 1000));
        try {
          return await callGemini(model);
        } catch (retryErr) {
          return fallbackError(retryErr);
        }
      }
      return fallbackError(error);
    }
  }
  return fallbackError(new Error('All models failed'));

  function fallbackError(error) {
    const msg = error.message || String(error);
    console.error('[Gemini] Raw error:', msg);
    let userMsg = 'Error processing file. Please try again.';
    if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('quota') || msg.includes('limit: 0')) {
      userMsg = 'AI request limit reached. Wait a moment and try again, or enable billing at ai.google.dev for higher limits.';
    } else if (msg.includes('404') || msg.toLowerCase().includes('not found')) {
      userMsg = `Model not available for this API key. Try GEMINI_MODEL=gemini-2.5-flash in backend .env, or check ai.google.dev for available models.`;
    } else if (msg.includes('401') || msg.includes('API key') || msg.includes('invalid')) {
      userMsg = 'Invalid or missing GEMINI_API_KEY in backend .env';
    } else if (msg) {
      userMsg = msg.slice(0, 200);
    }
    return {
      verbalSummary: userMsg,
      keyFindings: [],
      abnormalVitals: [],
      coreMetrics: {},
      error: userMsg,
    };
  }
}

/**
 * Summarize all patient files in a single Gemini API call.
 * @param {Array<{id: string, content: string}>} files - Files with id and content
 * @returns {Promise<Record<string, object>>} Map of file id -> summary
 */
export async function summarizePatientFilesBatch(files) {
  if (!files?.length) return {};

  const schemaDesc = `{
  "keyFindings": ["string"],
  "abnormalVitals": ["string"],
  "coreMetrics": { "heartRate": "string", "bloodPressure": "string" },
  "verbalSummary": "string"
}`;

  const blocks = files.map(
    (f, i) =>
      `--- PATIENT ${i + 1} (id: ${String(f.id)}) ---\n${(f.content || '').slice(0, 8000)}`
  ).join('\n\n');

  const prompt = `You are a medical assistant. Analyze these ${files.length} patient files. For EACH patient, extract:
1. Key findings (2-4 bullet points)
2. Abnormal vitals or lab values (highlight if any)
3. Core metrics (HR, BP, temp, etc.) in a brief table format
4. A 2-3 sentence clinical summary for verbal readout

Use **double asterisks** around clinically important terms. Keep the double asterisks inside the JSON strings.

Output ONLY a valid JSON array with exactly ${files.length} elements, in the SAME ORDER as the input. Each element schema:
${schemaDesc}

Example: [{"keyFindings":[],"abnormalVitals":[],"coreMetrics":{},"verbalSummary":"..."}, ...]

Patient files:
${blocks}`;

  function parseBatchResponse(text) {
    let str = String(text || '').trim();
    const codeBlockMatch = str.match(/[`\uFF40]{3,}\s*json\s*([\s\S]*?)\s*[`\uFF40]{3,}/i);
    if (codeBlockMatch) str = codeBlockMatch[1].trim();
    str = str.replace(/^[\s]*[`\uFF40]{3,}\s*json?\s*/gi, '').replace(/\s*[`\uFF40]{3,}\s*$/g, '').trim();
    str = str.replace(/^[`\uFF40\s]+/, '').trim();
    const start = str.indexOf('[');
    const end = str.lastIndexOf(']');
    if (start < 0 || end <= start) throw new Error('No JSON array found');
    return JSON.parse(str.slice(start, end + 1));
  }

  try {
    const rawText = await callGeminiREST(GEMINI_MODEL, prompt);
    const arr = parseBatchResponse(rawText);
    const result = {};
    files.forEach((f, i) => {
      const item = Array.isArray(arr) && arr[i] ? arr[i] : null;
      const id = String(f.id);
      result[id] = item && typeof item === 'object'
        ? { summary: item, ...item }
        : { error: 'No summary returned', keyFindings: [], abnormalVitals: [], coreMetrics: {}, verbalSummary: '' };
    });
    return result;
  } catch (e) {
    console.error('[Gemini] Batch error:', e.message);
    const errMsg = e.message?.slice(0, 150) || 'Batch summarize failed';
    const fallback = {};
    files.forEach((f) => {
      const id = String(f.id);
      fallback[id] = {
        error: errMsg,
        keyFindings: [],
        abnormalVitals: [],
        coreMetrics: {},
        verbalSummary: errMsg,
      };
    });
    return fallback;
  }
}
