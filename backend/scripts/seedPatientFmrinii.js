/**
 * Seeds patient_fmrinii collection: patients 1-6 -> fmrinii through fmrinii6.
 * Patients 7+ have no fMRI assigned (popup shows "no files for this patient yet").
 */
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { getCollection } from '../db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env') });

const PATIENT_FMRINII = [
  { patientId: 'MR847291', fileId: 'demo-1', fmriniiFolder: 'fmrinii' },
  { patientId: 'P-2847', fileId: 'demo-2', fmriniiFolder: 'fmrinii2' },
  { patientId: 'MR923104', fileId: 'demo-3', fmriniiFolder: 'fmrinii3' },
  { patientId: 'MR451082', fileId: 'demo-4', fmriniiFolder: 'fmrinii4' },
  { patientId: 'P-3902', fileId: 'demo-5', fmriniiFolder: 'fmrinii5' },
  { patientId: 'MR552193', fileId: 'demo-6', fmriniiFolder: 'fmrinii6' },
];

export async function seedPatientFmrinii() {
  try {
    const col = getCollection('patient_fmrinii');
    for (const doc of PATIENT_FMRINII) {
      await col.updateOne(
        { patientId: doc.patientId },
        { $set: { ...doc, updatedAt: new Date() } },
        { upsert: true }
      );
    }
    console.log('[seed] patient_fmrinii: Patients 1-6 -> fmrinii through fmrinii6');
  } catch (e) {
    console.warn('[seed] patient_fmrinii skipped:', e?.message);
  }
}
