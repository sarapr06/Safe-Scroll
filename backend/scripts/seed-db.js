#!/usr/bin/env node
/**
 * Seed MongoDB with sample patient files for testing.
 * Run: cd backend && node scripts/seed-db.js
 * Requires MONGODB_URI in backend/.env or environment.
 */

import 'dotenv/config';
import { MongoClient } from 'mongodb';

const sampleFiles = [
  {
    patientId: 'P001',
    title: 'John Doe - Admission Notes',
    content: `ADMISSION NOTES - 2024-01-15
Patient: John Doe, M, 58yo
Chief complaint: Chest pain x 2 hours

Vitals on arrival:
- BP: 165/95 mmHg (elevated)
- HR: 92 bpm
- Temp: 98.6°F
- SpO2: 96% on RA

Labs:
- Troponin: 0.12 ng/mL (elevated)
- CK-MB: 4.2
- BNP: 180 pg/mL
- LDL: 145 mg/dL

ECG: ST elevation in leads V2-V4. STEMI protocol activated.
Plan: Cath lab, ASA 325mg, Plavix 600mg load.`,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    patientId: 'P002',
    title: 'Jane Smith - Lab Results',
    content: `LAB RESULTS - 2024-01-16
Patient: Jane Smith, F, 34yo

CBC:
- WBC: 11.2 (elevated)
- RBC: 4.1
- Hgb: 12.8
- Platelets: 245

Chemistry:
- Glucose: 88
- Creatinine: 0.9
- BUN: 14
- Sodium: 138
- Potassium: 4.2

Liver panel normal. Urinalysis: trace protein.`,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

async function seed() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('Set MONGODB_URI in backend/.env');
    process.exit(1);
  }
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db();
  const col = db.collection('patient_files');
  const r = await col.insertMany(sampleFiles);
  console.log('Inserted', r.insertedCount, 'sample patient files');
  await client.close();
}

seed().catch(console.error);
