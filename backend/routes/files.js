import { Router } from 'express';
import { getCollection } from '../db.js';

export const filesRouter = Router();

filesRouter.get('/', async (req, res) => {
  try {
    const col = getCollection('patient_files');
    const files = await col.find({}).sort({ updatedAt: -1 }).limit(50).toArray();
    res.json(files);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

filesRouter.get('/:id', async (req, res) => {
  try {
    const { ObjectId } = await import('mongodb');
    const col = getCollection('patient_files');
    const file = await col.findOne({ _id: new ObjectId(req.params.id) });
    if (!file) return res.status(404).json({ error: 'Not found' });
    res.json(file);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
