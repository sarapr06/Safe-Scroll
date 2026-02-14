/**
 * Maps imaging types to sample_data assets.
 * sample_data is served from /sample_data/ via public symlink.
 */
export const SAMPLE_DATA_BY_IMAGING_TYPE = {
  ct: [
    { url: '/sample_data/2_skull_ct/Skull_2_NAME%5ENONE_Volume_1.jpg', label: 'Skull CT - Volume 1' },
    { url: '/sample_data/2_skull_ct/Skull_2_NAME%5ENONE_Volume_2.jpg', label: 'Skull CT - Volume 2' },
    { url: '/sample_data/2_skull_ct/Skull_2_NAME%5ENONE_Volume_3.jpg', label: 'Skull CT - Volume 3' },
  ],
  mri: [
    { url: '/sample_data/MRI/structural_brain.nii.gz', label: 'MRI Volume (scroll slices)', isNiftiGz: true },
    { url: '/sample_data/MRI/MRI1/report.html', label: 'MRI Report', isIframe: true },
    { url: '/sample_data/MRI/MRI1/tsplot/tsplot_index.html', label: 'MRI Time Series', isIframe: true },
  ],
  xray_fluoroscopy: [
    { url: '/sample_data/xray.jpg', label: 'X-ray' },
  ],
  ultrasound: [
    { url: '/sample_data/ultrasound.jpg', label: 'Ultrasound' },
  ],
  imaging_3d: [
    { url: '/sample_data/2_skull_ct/Skull_2_NAME%5ENONE_Volume_0.PNG', label: '3D Volume' },
  ],
  pet: [
    // No sample data for PET - will show as text only
  ],
  clinical_photography: [
    { url: '/sample_data/images_preop.jpeg', label: 'Pre-op photography' },
  ],
};
