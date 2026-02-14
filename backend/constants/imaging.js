/**
 * Medical imaging types with descriptions.
 * Each patient can have one or more studies per type.
 */
export const IMAGING_TYPES = {
  ct: {
    id: 'ct',
    label: 'CT Scans (Computed Tomography)',
    description: 'Detailed, cross-sectional views of bones and soft tissues.',
  },
  mri: {
    id: 'mri',
    label: 'MRIs (Magnetic Resonance Imaging)',
    description: 'High-contrast, detailed images of soft tissues, often used in brain or spine surgeries.',
  },
  xray_fluoroscopy: {
    id: 'xray_fluoroscopy',
    label: 'X-rays / Fluoroscopy',
    description: 'Viewing bones (orthopedic) and real-time monitoring of procedures, such as catheter placement.',
  },
  ultrasound: {
    id: 'ultrasound',
    label: 'Ultrasound',
    description: 'Real-time, non-invasive imaging, often in biopsies or to view blood flow.',
  },
  imaging_3d: {
    id: 'imaging_3d',
    label: '3D Imaging / Modeling',
    description: 'Advanced, precise, pre-surgical planning.',
  },
  pet: {
    id: 'pet',
    label: 'PET Scans',
    description: 'Detection of metabolic activity, often for tumor identification.',
  },
  clinical_photography: {
    id: 'clinical_photography',
    label: 'Clinical Photography',
    description: 'Before-and-after, 3D, and standard photos for planning, tracking, and analyzing cosmetic or reconstructive results.',
  },
};

export const IMAGING_TYPE_IDS = Object.keys(IMAGING_TYPES);
