/**
 * Demo imaging studies for fallback when MongoDB/API unavailable.
 * Matches patient IDs from demoPatients.js.
 */
export const DEMO_IMAGING = {
  'MR847291': [
    { _id: 'demo-img-0', patientId: 'MR847291', type: 'mri', label: 'MRI Volume (.nii.gz)', findings: 'Brain – scroll through slices', studyDate: '2026-02-14' },
    { _id: 'demo-img-1', patientId: 'MR847291', type: 'ct', label: 'CT Scans (Computed Tomography)', findings: 'Abdomen/pelvis without contrast', studyDate: '2026-02-01' },
    { _id: 'demo-img-2', patientId: 'MR847291', type: 'ultrasound', label: 'Ultrasound', findings: 'Abdomen complete', studyDate: '2026-01-28' },
  ],
  'P-2847': [
    { _id: 'demo-img-3', patientId: 'P-2847', type: 'xray_fluoroscopy', label: 'X-rays / Fluoroscopy', findings: 'Knee AP/lateral', studyDate: '2026-02-05' },
    { _id: 'demo-img-4', patientId: 'P-2847', type: 'imaging_3d', label: '3D Imaging / Modeling', findings: 'Craniofacial reconstruction', studyDate: '2026-02-10' },
  ],
  'MR923104': [
    { _id: 'demo-img-5', patientId: 'MR923104', type: 'mri', label: 'MRIs (Magnetic Resonance Imaging)', findings: 'Knee', studyDate: '2026-02-08' },
    { _id: 'demo-img-6', patientId: 'MR923104', type: 'clinical_photography', label: 'Clinical Photography', findings: 'Pre-op baseline', studyDate: '2026-02-12' },
  ],
};
