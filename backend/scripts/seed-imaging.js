#!/usr/bin/env node
/**
 * Seed MongoDB with patient imaging studies.
 * Supports all 7 imaging types: CT, MRI, X-ray/Fluoroscopy, Ultrasound, 3D, PET, Clinical Photography.
 *
 * Run: cd backend && node scripts/seed-imaging.js
 * Run seed-preop-patients.js first to ensure patients exist, or this script will use fallback IDs.
 * Requires MONGODB_URI in backend/.env
 */

import 'dotenv/config';
import { MongoClient } from 'mongodb';
import { IMAGING_TYPE_IDS, IMAGING_TYPES } from '../constants/imaging.js';

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const studyDate = () => {
  const d = new Date();
  d.setDate(d.getDate() - randInt(0, 90));
  return d;
};

/** Example findings per imaging type */
const findingsByType = {
  ct: ['Abdomen/pelvis without contrast', 'Chest with IV contrast', 'Head without contrast', 'Spine lumbar'],
  mri: ['Brain with/without contrast', 'Lumbar spine', 'Knee', 'Shoulder', 'Pelvis'],
  xray_fluoroscopy: ['CXR 2 views', 'Knee AP/lateral', 'Fluoroscopy - catheter placement', 'Spine AP/lateral'],
  ultrasound: ['Abdomen complete', 'Doppler lower extremity', 'Thyroid', 'Echocardiogram'],
  imaging_3d: ['Craniofacial reconstruction', 'Surgical plan - tumor resection'],
  pet: ['Whole body FDG-PET/CT', 'Brain amyloid PET', 'Tumor staging'],
  clinical_photography: ['Pre-op baseline', 'Post-op day 1', '3D facial capture', 'Wound progression series'],
};

function generateImagingStudy(patientId, typeId) {
  const typeDef = IMAGING_TYPES[typeId];
  const findings = findingsByType[typeId] || [typeDef.label];
  const studyDateVal = studyDate();
  return {
    patientId,
    type: typeId,
    label: typeDef.label,
    description: typeDef.description,
    studyDate: studyDateVal,
    findings: pick(findings),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

async function seed() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('Set MONGODB_URI in backend/.env');
    process.exit(1);
  }

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db();
  const filesCol = db.collection('patient_files');
  const imagingCol = db.collection('patient_imaging');

  // Get distinct patient IDs from patient_files, or use fallback
  const patientIds = await filesCol.distinct('patientId');
  const idsToUse = patientIds.length > 0 ? patientIds : ['MR847291', 'P-2847', 'MR923104', 'P001', 'P002'];

  if (patientIds.length === 0) {
    console.log('No patients in patient_files. Using fallback IDs:', idsToUse.join(', '));
    console.log('Run seed-preop-patients.js first for real patient data.');
  }

  const studies = [];
  for (const patientId of idsToUse) {
    // Give each patient 2–4 imaging studies across different types
    const numStudies = randInt(2, 4);
    const usedTypes = new Set();
    for (let i = 0; i < numStudies; i++) {
      const available = IMAGING_TYPE_IDS.filter((id) => !usedTypes.has(id));
      if (available.length === 0) break;
      const typeId = pick(available);
      usedTypes.add(typeId);
      studies.push(generateImagingStudy(patientId, typeId));
    }
  }

  // Optional: clear existing seeded imaging
  await imagingCol.deleteMany({});
  const r = await imagingCol.insertMany(studies);
  console.log(`Inserted ${r.insertedCount} imaging studies for ${idsToUse.length} patients`);
  console.log('Imaging types used:', [...new Set(studies.map((s) => s.type))].join(', '));
  await client.close();
}

seed().catch(console.error);
