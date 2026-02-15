import { useState, useEffect } from 'react';

const API = '/api';

/**
 * Fullscreen popup that shows MRI JPG slices from sample_data/MRI/fmrinii*.
 * Patients 1-6 -> fmrinii through fmrinii6. Patients 7+ show "No files for this patient yet."
 * Parent controls visibility (finger present) and index (from U/D scroll).
 */
export function MRISlicePopup({ visible, sliceIndex, currentFile }) {
  const [slices, setSlices] = useState([]);
  const [loading, setLoading] = useState(true);

  const patientId = currentFile?.patientId;
  const fileId = currentFile?._id ?? currentFile?.id;

  useEffect(() => {
    const params = new URLSearchParams();
    if (patientId) params.set('patientId', patientId);
    if (fileId) params.set('fileId', fileId);
    const qs = params.toString();
    fetch(`${API}/fmrinii/slices${qs ? `?${qs}` : ''}`)
      .then((r) => r.json())
      .then((d) => {
        const list = Array.isArray(d?.slices) ? d.slices : [];
        setSlices(list);
      })
      .catch(() => setSlices([]))
      .finally(() => setLoading(false));
  }, [patientId, fileId]);

  const index = Math.max(0, Math.min(sliceIndex, slices.length - 1));
  const current = slices[index];
  const prevUrl = index > 0 ? slices[index - 1]?.url : null;
  const nextUrl = index < slices.length - 1 ? slices[index + 1]?.url : null;

  if (!visible) return null;

  return (
    <div className="mri-slice-popup" role="dialog" aria-label="MRI slices">
      <div className="mri-slice-popup-backdrop" />
      <div className="mri-slice-popup-content">
        <div className="mri-slice-popup-header">
          <span className="mri-slice-popup-title">fMRI Slices</span>
          <span className="mri-slice-popup-counter">
            {loading ? '…' : `${index + 1} / ${slices.length || 1}`}
          </span>
        </div>
        <div className="mri-slice-popup-image-wrap">
          {loading ? (
            <div className="mri-slice-popup-loading">Loading slices…</div>
          ) : current ? (
            <>
              {prevUrl && <link rel="preload" href={prevUrl} as="image" />}
              {nextUrl && <link rel="preload" href={nextUrl} as="image" />}
              <img
                src={current.url}
                alt={`Slice ${index + 1}`}
                className="mri-slice-popup-img"
              />
            </>
          ) : (
            <div className="mri-slice-popup-empty">
              No files for this patient yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
