#!/usr/bin/env node
/**
 * Seed MongoDB with random pre-op patient files based on:
 * - PERI-OPERATIVE RECORD template
 * - PATIENT REPORT SHEET template
 *
 * Run: cd backend && node scripts/seed-preop-patients.js
 * Requires MONGODB_URI in backend/.env
 */

import 'dotenv/config';
import { MongoClient } from 'mongodb';

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const mrNum = () => `MR${randInt(100000, 999999)}`;
const time = () => `${randInt(6, 18)}:${pick(['00', '15', '30', '45'])}`;

const firstNames = ['James', 'Mary', 'Robert', 'Patricia', 'John', 'Jennifer', 'Michael', 'Linda', 'David', 'Elizabeth', 'William', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica', 'Thomas', 'Sarah'];
const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Wilson', 'Anderson', 'Thomas', 'Taylor'];
const diagnoses = ['Cholelithiasis', 'Appendicitis', 'Hernia repair', 'Knee arthroplasty', 'Cataract extraction', 'Hysterectomy', 'Cholecystitis', 'Colon resection', 'Thyroidectomy', 'Hip replacement'];
const procedures = ['Laparoscopic cholecystectomy', 'Appendectomy', 'Inguinal hernia repair', 'Total knee arthroplasty', 'Phacoemulsification with IOL', 'Total abdominal hysterectomy', 'Open cholecystectomy', 'Right hemicolectomy', 'Total thyroidectomy', 'Total hip arthroplasty'];
const surgeons = ['Dr. Chen', 'Dr. Patel', 'Dr. Kim', 'Dr. Garcia', 'Dr. Williams', 'Dr. Johnson'];
const anesthesiaTypes = ['General', 'Spinal', 'MAC', 'Local / Block'];
const woundClasses = ['1 (clean)', '2 (clean / contaminated)', '3 (contaminated)', '4 (infected)'];
const allergies = ['Penicillin', 'Sulfa', 'Latex', 'Shellfish', 'None'];
const neuroStatus = ['Alert & Oriented', 'Confused', 'Lethargic'];
const cardiacStatus = ['Regular', 'Irregular', 'Murmur'];
const ivTypes = ['PIV', 'PICC', 'Central Line'];
const isolation = ['Contact', 'Droplet', 'Airborne', 'None'];

function generatePeriOpRecord() {
  const lastName = pick(lastNames);
  const firstName = pick(firstNames);
  const name = `${firstName} ${lastName}`;
  const mr = mrNum();
  const preDx = pick(diagnoses);
  const opProc = pick(procedures);
  const formData = {
    patientName: name,
    mrNumber: mr,
    date: new Date().toISOString().split('T')[0],
    patientInRoom: time(),
    anesthesiaStart: time(),
    timeOut: time(),
    procedureStart: time(),
    suiteNumber: randInt(1, 12),
    woundClass: pick(woundClasses),
    anesthesia: pick(anesthesiaTypes),
    levelOfConsciousness: pick(['Alert', 'Oriented', 'Drowsy / Sedated']),
    emotionalStatus: pick(['Calm', 'Cooperative', 'Nervous']),
    allergies: pick(allergies),
    npoAfterMidnight: 'Yes',
    skinCondition: pick(['Intact where seen', 'Warm', 'Dry', 'Pink']),
    preOpDiagnosis: preDx,
    operativeProcedures: opProc,
    postOpDiagnosis: preDx,
    surgeon: pick(surgeons),
    anesthesiaProvider: `Dr. ${pick(lastNames)}`,
  };

  const content = `PERI-OPERATIVE RECORD - Page 1 of 3

Patient: ${name}  |  MR#: ${mr}
Date: ${formData.date}  |  Suite #: ${formData.suiteNumber}

TIMING:
Patient in Room: ${formData.patientInRoom}
Anesthesia Start: ${formData.anesthesiaStart}
Time Out: ${formData.timeOut}
Procedure Start: ${formData.procedureStart}

PRE-OPERATIVE ASSESSMENT:
✓ Patient Identification verified
✓ Pre-Op Assessment reviewed
✓ H & P reviewed
✓ Operative Consent verified
✓ Pre-Op Antibiotic given

WOUND CLASS: ${formData.woundClass}
ANESTHESIA: ${formData.anesthesia}
LEVEL OF CONSCIOUSNESS: ${formData.levelOfConsciousness}
EMOTIONAL STATUS: ${formData.emotionalStatus}

ALLERGIES: ${formData.allergies}
NPO AFTER MIDNIGHT: ${formData.npoAfterMidnight}
SKIN CONDITION: ${formData.skinCondition}

PRE-OPERATIVE DIAGNOSIS:
${formData.preOpDiagnosis}

OPERATIVE PROCEDURES:
${formData.operativeProcedures}

PERSONNEL:
Surgeon: ${formData.surgeon}
Anesthesia Provider: ${formData.anesthesiaProvider}`;

  return {
    type: 'peri_operative',
    patientId: mr,
    title: `Peri-Operative Record - ${name}`,
    formData,
    content,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function generatePatientReportSheet() {
  const lastName = pick(lastNames);
  const firstName = pick(firstNames);
  const name = `${firstName} ${lastName}`;
  const dob = `${randInt(1945, 1995)}-${String(randInt(1, 12)).padStart(2, '0')}-${String(randInt(1, 28)).padStart(2, '0')}`;
  const dx = pick(diagnoses);
  const pmh = pick(['HTN, DM2', 'COPD', 'CAD, Afib', 'CHF', 'Asthma', 'None significant']);
  const psh = pick(['Appendectomy 2010', 'Cholecystectomy 2018', 'Knee scope 2020', 'None']);
  const hr = randInt(62, 98);
  const sys = randInt(110, 145);
  const dia = randInt(65, 88);
  const rr = randInt(12, 20);
  const spo2 = randInt(95, 100);
  const temp = (97.5 + Math.random() * 2).toFixed(1);
  const roomBed = `${randInt(100, 500)}/${String(randInt(1, 4))}`;
  const dateShift = pick(['AM', 'PM', 'Night']);
  const meds = pick(['Lisinopril 10mg daily', 'Metformin 500mg BID', 'Aspirin 81mg', 'Atorvastatin 20mg', 'None']);
  const painLevel = randInt(0, 6);
  const neuro = pick(neuroStatus);
  const cardiac = pick(cardiacStatus);
  const gi = pick(['Normal', 'NPO']);
  const gu = pick(['Voiding', 'Foley']);
  const skin = pick(['Intact', 'Wounds: Pressure ulcer sacrum']);

  const formData = {
    patientName: name,
    dob,
    roomBed,
    dateShift,
    allergies: pick(allergies),
    isolation: pick(isolation),
    diagnosis: dx,
    pmh,
    psh,
    meds,
    ivAccess: pick(ivTypes),
    vitals: { temp, hr, bp: `${sys}/${dia}`, rr, spo2 },
    painLevel,
    neuro,
    cardiac,
    respiratory: 'Normal',
    gi,
    gu,
    skin,
  };

  const content = `PATIENT REPORT SHEET TEMPLATE

Patient Name: ${name}
DOB: ${dob}  |  Room/Bed: ${roomBed}
Date/Shift: ${dateShift}

Allergies: ${formData.allergies}
Isolation: ${formData.isolation}

DIAGNOSIS: ${dx}
PMH: ${pmh}
PSH: ${psh}

Meds: ${meds}
IV Access: ${formData.ivAccess}

LAST SET OF VITALS:
T: ${temp}°F  HR: ${hr}  BP: ${sys}/${dia}
RR: ${rr}  SpO2: ${spo2}%

Pain Level: ${painLevel}/10

SYSTEMS:
Neuro: ${neuro}
Cardiac: ${cardiac}
Respiratory: Normal
GI: ${gi}
GU: ${gu}
Skin: ${skin}

Pending procedures: Pre-op workup complete, cleared for surgery
Recent labs/imaging: CBC, BMP, EKG within normal limits`;

  return {
    type: 'patient_report_sheet',
    patientId: `P-${randInt(1000, 9999)}`,
    title: `Patient Report Sheet - ${name}`,
    formData,
    content,
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

  const records = [];
  for (let i = 0; i < 10; i++) {
    records.push(generatePeriOpRecord());
    records.push(generatePatientReportSheet());
  }
  // Shuffle so we get a mix
  records.sort(() => Math.random() - 0.5);

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db();
  const col = db.collection('patient_files');

  // Optional: clear existing seeded pre-op files (keep structure flexible)
  // await col.deleteMany({ type: { $in: ['peri_operative', 'patient_report_sheet'] } });

  const r = await col.insertMany(records);
  console.log(`Inserted ${r.insertedCount} pre-op patient files:`);
  console.log(`  - ${records.filter((d) => d.type === 'peri_operative').length} Peri-Operative Records`);
  console.log(`  - ${records.filter((d) => d.type === 'patient_report_sheet').length} Patient Report Sheets`);
  await client.close();
}

seed().catch(console.error);
