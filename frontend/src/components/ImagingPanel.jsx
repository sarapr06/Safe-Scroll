import { SAMPLE_DATA_BY_IMAGING_TYPE } from '../sampleDataPaths.js';
import { NiftiViewer } from './NiftiViewer.jsx';

/**
 * Displays patient imaging studies (CT, MRI, X-ray, Ultrasound, 3D, PET, Clinical Photography).
 * Fetches from /api/imaging?patientId=... or uses demo imaging when offline.
 * Shows sample_data assets for each imaging type when available.
 * Supports .nii/.nii.gz for scroll-through slice viewing.
 */
export function ImagingPanel({ patientId, imaging = null, loading = false, demoImaging = null }) {
  if (!patientId) return null;

  const studies = (imaging?.length ? imaging : null) ?? demoImaging ?? [];
  const hasStudies = Array.isArray(studies) && studies.length > 0;

  if (loading) {
    return (
      <div className="imaging-panel">
        <h3 className="imaging-title">Imaging Studies</h3>
        <p className="imaging-loading">Loading imaging…</p>
      </div>
    );
  }

  if (!hasStudies) {
    return (
      <div className="imaging-panel">
        <h3 className="imaging-title">Imaging Studies</h3>
        <p className="imaging-empty">No imaging studies on file for this patient.</p>
      </div>
    );
  }

  return (
    <div className="imaging-panel">
      <h3 className="imaging-title">Imaging Studies</h3>
      <ul className="imaging-list">
        {studies.map((s, i) => {
          const sampleAssets = SAMPLE_DATA_BY_IMAGING_TYPE[s.type] || [];
          return (
            <li key={s._id || i} className="imaging-item">
              <div className="imaging-details">
                <strong className="imaging-type">{s.label || s.type}</strong>
                {s.findings && <span className="imaging-findings">{s.findings}</span>}
                {s.studyDate && (
                  <span className="imaging-date">
                    {new Date(s.studyDate).toLocaleDateString()}
                  </span>
                )}
                {sampleAssets.length > 0 && (
                  <div className="imaging-assets">
                    {sampleAssets.map((asset, j) =>
                      asset.isNiftiGz ? (
                        <NiftiViewer key={j} url={asset.url} label={asset.label} />
                      ) : asset.isIframe ? (
                        <iframe
                          key={j}
                          src={asset.url}
                          title={asset.label}
                          className="imaging-iframe"
                        />
                      ) : (
                        <a
                          key={j}
                          href={asset.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="imaging-asset-link"
                        >
                          <img src={asset.url} alt={asset.label} className="imaging-thumb" />
                          <span className="imaging-asset-label">{asset.label}</span>
                        </a>
                      )
                    )}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
