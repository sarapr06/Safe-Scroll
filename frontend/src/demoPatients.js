/**
 * Demo patient files - shown when MongoDB returns empty (e.g. connection issues).
 * Use gestures to navigate and scroll these.
 */
export const DEMO_PATIENTS = [
  {
    _id: 'demo-1',
    patientId: 'MR847291',
    title: 'Peri-Operative Record - Jennifer Lofgreen',
    type: 'peri_operative',
    content: `PERI-OPERATIVE RECORD - Page 1 of 3

Patient: Jennifer Lofgreen  |  MR#: MR847291
Date: 2026-02-14  |  Suite #: 3

TIMING:
Patient in Room: 07:30
Anesthesia Start: 07:45
Time Out: 08:00
Procedure Start: 08:15

PRE-OPERATIVE ASSESSMENT:
✓ Patient Identification verified
✓ Pre-Op Assessment reviewed
✓ H & P reviewed
✓ Operative Consent verified
✓ Pre-Op Antibiotic given

WOUND CLASS: 1 (clean)
ANESTHESIA: General
LEVEL OF CONSCIOUSNESS: Alert
EMOTIONAL STATUS: Calm

ALLERGIES: Penicillin
NPO AFTER MIDNIGHT: Yes
SKIN CONDITION: Intact where seen

PRE-OPERATIVE DIAGNOSIS:
Cholelithiasis

OPERATIVE PROCEDURES:
Laparoscopic cholecystectomy

PERSONNEL:
Surgeon: Dr. Chen
Anesthesia Provider: Dr. Williams`,
  },
  {
    _id: 'demo-2',
    patientId: 'P-2847',
    title: 'Patient Report Sheet - Roger Carrick',
    type: 'patient_report_sheet',
    content: `PATIENT REPORT SHEET TEMPLATE

Patient Name: Roger Carrick
DOB: 1965-03-22  |  Room/Bed: 412/2
Date/Shift: AM

Allergies: None
Isolation: None

DIAGNOSIS: Hernia repair
PMH: HTN, DM2
PSH: Appendectomy 2010

Meds: Lisinopril 10mg daily, Metformin 500mg BID
IV Access: PIV

LAST SET OF VITALS:
T: 98.4°F  HR: 72  BP: 128/82
RR: 16  SpO2: 98%

Pain Level: 2/10

SYSTEMS:
Neuro: Alert & Oriented
Cardiac: Regular
Respiratory: Normal
GI: Normal
GU: Voiding
Skin: Intact

Pending procedures: Pre-op workup complete, cleared for surgery
Recent labs/imaging: CBC, BMP, EKG within normal limits`,
  },
  {
    _id: 'demo-3',
    patientId: 'MR923104',
    title: 'Peri-Operative Record - Chris Yip',
    type: 'peri_operative',
    content: `PERI-OPERATIVE RECORD - Page 1 of 3

Patient: Chris Yip  |  MR#: MR923104
Date: 2026-02-14  |  Suite #: 7

TIMING:
Patient in Room: 09:00
Anesthesia Start: 09:15
Time Out: 09:25
Procedure Start: 09:40

WOUND CLASS: 2 (clean / contaminated)
ANESTHESIA: Spinal
LEVEL OF CONSCIOUSNESS: Oriented
EMOTIONAL STATUS: Cooperative

ALLERGIES: Latex
NPO AFTER MIDNIGHT: Yes
SKIN CONDITION: Warm, Pink

PRE-OPERATIVE DIAGNOSIS:
Knee arthroplasty

OPERATIVE PROCEDURES:
Total knee arthroplasty

Surgeon: Dr. Patel
Anesthesia Provider: Dr. Kim`,
  },
  {
    _id: 'demo-4',
    patientId: 'MR451082',
    title: 'Peri-Operative Record - Mary Pugh',
    type: 'peri_operative',
    content: `PERI-OPERATIVE RECORD - Page 1 of 2

Patient: Mary Pugh  |  MR#: MR451082
Date: 2026-02-15  |  Suite #: 2

TIMING:
Patient in Room: 08:00
Anesthesia Start: 08:15
Time Out: 08:25
Procedure Start: 08:35

WOUND CLASS: 1 (clean)
ANESTHESIA: General
LEVEL OF CONSCIOUSNESS: Alert
EMOTIONAL STATUS: Anxious

ALLERGIES: Sulfa
NPO AFTER MIDNIGHT: Yes
SKIN CONDITION: Intact

PRE-OPERATIVE DIAGNOSIS:
Cataract, right eye

OPERATIVE PROCEDURES:
Phacoemulsification with IOL insertion

Surgeon: Dr. Foster
Anesthesia Provider: Dr. Hayes`,
  },
  {
    _id: 'demo-5',
    patientId: 'P-3902',
    title: 'Patient Report Sheet - Vardan Papyan',
    type: 'patient_report_sheet',
    content: `PATIENT REPORT SHEET

Patient Name: Vardan Papyan
DOB: 1978-11-08  |  Room/Bed: 205/1
Date/Shift: PM

Allergies: NSAIDs
Isolation: Contact precautions

DIAGNOSIS: Cellulitis, right lower leg
PMH: Type 2 Diabetes
PSH: None

Meds: Vancomycin IV, Insulin sliding scale
IV Access: PIV right AC

LAST SET OF VITALS:
T: 99.1°F  HR: 88  BP: 142/90
RR: 18  SpO2: 97%

Pain Level: 4/10

SYSTEMS:
Neuro: Alert
Cardiac: Tachycardia
Respiratory: Clear
Skin: Erythema, warmth RLE

Pending: Infectious disease consult
Recent: Blood cultures drawn, CRP elevated`,
  },
  {
    _id: 'demo-6',
    patientId: 'MR552193',
    title: 'Peri-Operative Record - Murdock Aubry',
    type: 'peri_operative',
    content: `PERI-OPERATIVE RECORD

Patient: Murdock Aubry  |  MR#: MR552193
Date: 2026-02-15  |  Suite #: 5

TIMING:
Patient in Room: 10:30
Anesthesia Start: 10:45
Time Out: 11:00
Procedure Start: 11:10

WOUND CLASS: 2 (clean/contaminated)
ANESTHESIA: General, ETT
LEVEL OF CONSCIOUSNESS: Sedated

ALLERGIES: None known
NPO: Yes
SKIN CONDITION: Warm, dry

PRE-OPERATIVE DIAGNOSIS:
Colonic adenocarcinoma

OPERATIVE PROCEDURES:
Right hemicolectomy

Surgeon: Dr. Martinez
Anesthesia Provider: Dr. Thompson`,
  },
  {
    _id: 'demo-7',
    patientId: 'P-4126',
    title: 'Patient Report Sheet - Natalie Enright Jerger',
    type: 'patient_report_sheet',
    content: `PATIENT REPORT SHEET

Patient Name: Natalie Enright Jerger
DOB: 1985-04-17  |  Room/Bed: 318/2
Date/Shift: AM

Allergies: Peanuts
Isolation: None

DIAGNOSIS: S/P laparoscopic hysterectomy
PMH: Endometriosis
PSH: C-section 2018

Meds: Oxycodone 5mg PRN, Colace
IV Access: Saline lock

LAST SET OF VITALS:
T: 98.8°F  HR: 76  BP: 118/74
RR: 14  SpO2: 99%

Pain Level: 3/10

SYSTEMS:
Neuro: Alert & Oriented x4
GI: Nausea improved
GU: Voiding adequately
Skin: Incision dry, intact

Pending: Discharge planning
Activity: Up ad lib`,
  },
  {
    _id: 'demo-8',
    patientId: 'MR668041',
    title: 'Peri-Operative Record - J. W. Davis',
    type: 'peri_operative',
    content: `PERI-OPERATIVE RECORD

Patient: J. W. Davis  |  MR#: MR668041
Date: 2026-02-16  |  Suite #: 1

TIMING:
Patient in Room: 07:15
Anesthesia Start: 07:30
Time Out: 07:40
Procedure Start: 07:55

WOUND CLASS: 1 (clean)
ANESTHESIA: General, LMA
LEVEL OF CONSCIOUSNESS: Alert

ALLERGIES: Codeine
NPO: Yes
SKIN CONDITION: Intact

PRE-OPERATIVE DIAGNOSIS:
Inguinal hernia, bilateral

OPERATIVE PROCEDURES:
Bilateral inguinal hernia repair (mesh)

Surgeon: Dr. O'Brien
Anesthesia Provider: Dr. Singh`,
  },
  {
    _id: 'demo-9',
    patientId: 'P-4289',
    title: 'Patient Report Sheet - Brian Wilson',
    type: 'patient_report_sheet',
    content: `PATIENT REPORT SHEET

Patient Name: Brian Wilson
DOB: 1952-06-20  |  Room/Bed: 101/1
Date/Shift: PM

Allergies: Morphine
Isolation: MRSA colonization

DIAGNOSIS: CHF exacerbation
PMH: HTN, CAD, Afib
PSH: CABG 2019, Pacemaker

Meds: Lasix 40mg IV BID, Metoprolol, Eliquis
IV Access: PIV, CVC

LAST SET OF VITALS:
T: 98.2°F  HR: 68 (paced)  BP: 105/68
RR: 20  SpO2: 94% on 2L NC

Weight: 92 kg (down 2 kg from admission)
I/O: +800 cc negative

SYSTEMS:
Cardiac: Regular rhythm
Respiratory: Bibasilar crackles
Extremities: 2+ edema bilateral

Pending: Echo, Cardiology follow-up`,
  },
  {
    _id: 'demo-10',
    patientId: 'MR771205',
    title: 'Peri-Operative Record - Jay Werber',
    type: 'peri_operative',
    content: `PERI-OPERATIVE RECORD

Patient: Jay Werber  |  MR#: MR771205
Date: 2026-02-16  |  Suite #: 4

TIMING:
Patient in Room: 11:00
Anesthesia Start: 11:20
Time Out: 11:30
Procedure Start: 11:45

WOUND CLASS: 1 (clean)
ANESTHESIA: Monitored sedation
LEVEL OF CONSCIOUSNESS: Responsive

ALLERGIES: Latex
NPO: Yes
SKIN CONDITION: Clear

PRE-OPERATIVE DIAGNOSIS:
Trigger finger, left ring finger

OPERATIVE PROCEDURES:
Trigger finger release, left hand

Surgeon: Dr. Nakamura
Anesthesia Provider: Dr. Ross`,
  },
  {
    _id: 'demo-11',
    patientId: 'MR883617',
    title: 'Peri-Operative Record - Mary Pugh',
    type: 'peri_operative',
    content: `PERI-OPERATIVE RECORD

Patient: Mary Pugh  |  MR#: MR883617
Date: 2026-02-17  |  Suite #: 6

TIMING:
Patient in Room: 09:00
Anesthesia Start: 09:15
Procedure Start: 09:30

WOUND CLASS: 1
ANESTHESIA: Local with sedation
ALLERGIES: Sulfa

PRE-OPERATIVE DIAGNOSIS:
Basal cell carcinoma, nasal bridge

OPERATIVE PROCEDURES:
Mohs micrographic surgery, stage 1

Surgeon: Dr. Ahmed`,
  },
  {
    _id: 'demo-12',
    patientId: 'P-4551',
    title: 'Patient Report Sheet - Brian Wilson',
    type: 'patient_report_sheet',
    content: `PATIENT REPORT SHEET

Patient Name: Brian Wilson
DOB: 1952-06-20  |  Room/Bed: 101/1
Date/Shift: AM (Readmission)

Allergies: Morphine
Isolation: MRSA

DIAGNOSIS: S/P pacemaker generator change
PMH: CHF, CAD, Afib
PSH: CABG, Pacemaker

Meds: Home meds resumed
IV Access: Saline lock

VITALS:
T: 98.4°F  HR: 70 (paced)  BP: 112/72
SpO2: 97% RA

Incision: Dry, intact
Disposition: Discharge today`,
  },
  {
    _id: 'demo-13',
    patientId: 'MR994328',
    title: 'Peri-Operative Record - Vardan Papyan',
    type: 'peri_operative',
    content: `PERI-OPERATIVE RECORD

Patient: Vardan Papyan  |  MR#: MR994328
Date: 2026-02-18  |  Suite #: 3

TIMING:
Patient in Room: 08:30
Anesthesia Start: 08:45
Procedure Start: 09:00

WOUND CLASS: 1
ANESTHESIA: Spinal
ALLERGIES: NSAIDs

PRE-OPERATIVE DIAGNOSIS:
L4-L5 disc herniation

OPERATIVE PROCEDURES:
Microdiscectomy L4-L5

Surgeon: Dr. Chen
Anesthesia Provider: Dr. Williams`,
  },
];
