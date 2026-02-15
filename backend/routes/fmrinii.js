import { Router } from 'express';
import { readdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { getCollection } from '../db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const projectRoot = join(__dirname, '..', '..');
const MRI_BASE = join(projectRoot, 'frontend', 'sample_data', 'MRI');

/** Fallback mapping when MongoDB unavailable (fileId/patientId -> folder name) */
const DEMO_FMRINII_MAP = {
  'demo-1': 'fmrinii', MR847291: 'fmrinii',
  'demo-2': 'fmrinii2', 'P-2847': 'fmrinii2',
  'demo-3': 'fmrinii3', MR923104: 'fmrinii3',
  'demo-4': 'fmrinii4', MR451082: 'fmrinii4',
  'demo-5': 'fmrinii5', 'P-3902': 'fmrinii5',
  'demo-6': 'fmrinii6', MR552193: 'fmrinii6',
};

const JPG_EXT = /\.(jpg|jpeg|JPG|JPEG)$/;

function naturalSort(a, b) {
  const numA = parseInt(a.replace(/\D/g, ''), 10) || 0;
  const numB = parseInt(b.replace(/\D/g, ''), 10) || 0;
  if (numA !== numB) return numA - numB;
  return String(a).localeCompare(b);
}

function resolveFolder(patientId, fileId) {
  return (
    DEMO_FMRINII_MAP[patientId] ||
    DEMO_FMRINII_MAP[fileId] ||
    null
  );
}

export const fmriniiRouter = Router();

fmriniiRouter.get('/slices', async (req, res) => {
  try {
    const { patientId, fileId } = req.query;
    let folderName = null;

    try {
      const col = getCollection('patient_fmrinii');
      const byPatient = patientId ? await col.findOne({ patientId }) : null;
      const byFile = fileId && !byPatient ? await col.findOne({ fileId }) : null;
      const doc = byPatient || byFile;
      if (doc?.fmriniiFolder) folderName = doc.fmriniiFolder;
    } catch (_) {
      /* DB not connected, use fallback */
    }

    if (!folderName) folderName = resolveFolder(patientId, fileId);

    if (!folderName) {
      return res.json({ slices: [] });
    }

    const dir = join(MRI_BASE, folderName);
    const entries = await readdir(dir, { withFileTypes: true });
    const files = entries
      .filter((e) => e.isFile() && JPG_EXT.test(e.name))
      .map((e) => e.name)
      .sort(naturalSort);
    const baseUrl = `/sample_data/MRI/${folderName}`;
    const slices = files.map((name) => ({
      url: `${baseUrl}/${encodeURIComponent(name)}`,
      name,
    }));
    res.json({ slices });
  } catch (err) {
    if (err.code === 'ENOENT') {
      return res.json({ slices: [] });
    }
    console.error('[fmrinii]', err.message);
    res.status(500).json({ error: err.message });
  }
});
