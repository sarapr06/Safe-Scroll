import { Router } from 'express';
import { readdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const projectRoot = join(__dirname, '..', '..');
const FMRINII_DIR = process.env.FMRINII_DIR || join(projectRoot, 'frontend', 'sample_data', 'MRI', 'fmrinii');

const JPG_EXT = /\.(jpg|jpeg|JPG|JPEG)$/;

function naturalSort(a, b) {
  const numA = parseInt(a.replace(/\D/g, ''), 10) || 0;
  const numB = parseInt(b.replace(/\D/g, ''), 10) || 0;
  if (numA !== numB) return numA - numB;
  return String(a).localeCompare(b);
}

export const fmriniiRouter = Router();

fmriniiRouter.get('/slices', async (req, res) => {
  try {
    const entries = await readdir(FMRINII_DIR, { withFileTypes: true });
    const files = entries
      .filter((e) => e.isFile() && JPG_EXT.test(e.name))
      .map((e) => e.name)
      .sort(naturalSort);
    const baseUrl = '/sample_data/MRI/fmrinii';
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
