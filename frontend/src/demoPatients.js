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
Date: 2024-02-14  |  Suite #: 3

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
Date: 2024-02-14  |  Suite #: 7

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
];
