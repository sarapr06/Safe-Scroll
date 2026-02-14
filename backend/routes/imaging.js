import { Router } from 'express';
import { getCollection } from '../db.js';
import { IMAGING_TYPES } from '../constants/imaging.js';

export const imagingRouter = Router();

/**
 * GET /api/imaging?patientId=MR847291
 * Returns all imaging studies for a patient.
 */
imagingRouter.get('/', async (req, res) => {
  try {
    const { patientId } = req.query;
    if (!patientId) {
      return res.status(400).json({ error: 'patientId query param required' });
    }
    const col = getCollection('patient_imaging');
    const studies = await col
      .find({ patientId })
      .sort({ studyDate: -1, createdAt: -1 })
      .toArray();
    res.json(studies);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * GET /api/imaging/types
 * Returns the list of imaging type definitions.
 */
imagingRouter.get('/types', (_req, res) => {
  res.json(IMAGING_TYPES);
});
