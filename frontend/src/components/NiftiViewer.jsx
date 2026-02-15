import { useRef, useEffect, useState } from 'react';
import { Niivue } from '@niivue/niivue';

/**
 * Displays NIfTI .nii or .nii.gz volumes with slice scrolling.
 * - Mouse wheel over canvas: scroll through slices
 * - Slider: change slice explicitly (useful for touchless gestures)
 */
export function NiftiViewer({ url, label = 'MRI Volume' }) {
  const canvasRef = useRef(null);
  const nvRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sliceMax, setSliceMax] = useState(1);
  const [sliceIdx, setSliceIdx] = useState(0);
  const [ready, setReady] = useState(false);
  const sliceIdxRef = useRef(0);
  const sliceMaxRef = useRef(1);
  sliceIdxRef.current = sliceIdx;
  sliceMaxRef.current = sliceMax;

  useEffect(() => {
    if (!url || !canvasRef.current) return;
    setLoading(true);
    setError(null);
    const nv = new Niivue({
      loglevel: 'error',
      crosshairColor: [1, 0, 0, 0.5],
      backColor: [0.2, 0.2, 0.2, 1],
      onLocationChange: (data) => {
        if (data?.vox && Array.isArray(data.vox) && data.vox.length >= 3) {
          const z = Math.round(data.vox[2]);
          const max = sliceMaxRef.current;
          if (z >= 0 && z <= max && z !== sliceIdxRef.current) {
            setSliceIdx(z);
          }
        }
      },
    });
    nvRef.current = nv;

    async function load() {
      try {
        const fullUrl = url.startsWith('http') ? url : `${window.location.origin}${url.startsWith('/') ? '' : '/'}${url}`;
        await nv.attachToCanvas(canvasRef.current);
        await nv.loadVolumes([{ url: fullUrl }]);
        nv.setSliceType(nv.sliceTypeAxial);
        const vol = nv.volumes[0];
        const nz = vol ? (vol.dimsRAS?.[3] ?? vol.hdr?.dims?.[3] ?? 1) : 1;
        const max = Math.max(1, nz - 1);
        const mid = Math.floor(nz / 2);
        sliceMaxRef.current = max;
        setSliceMax(max);
        setSliceIdx(mid);
        setReady(true);
      } catch (e) {
        setError(e?.message || 'Failed to load volume');
      } finally {
        setLoading(false);
      }
    }
    load();
    return () => {
      const instance = nvRef.current;
      if (instance && typeof instance.cleanup === 'function') instance.cleanup();
      nvRef.current = null;
    };
  }, [url]);

  useEffect(() => {
    if (!ready || !nvRef.current) return;
    const nv = nvRef.current;
    const vol = nv.volumes[0];
    if (!vol?.dimsRAS) return;
    const nz = vol.dimsRAS[3];
    if (nz <= 1) return;
    const targetZ = Math.min(sliceIdx, nz - 1);
    let vox = [0, 0, 0];
    try {
      const pos = nv.scene?.crosshairPos ?? nv.sceneData?.crosshairPos;
      if (pos) vox = nv.frac2vox(pos);
    } catch (_) {}
    const currentZ = Math.round(vox[2] ?? 0);
    const delta = targetZ - currentZ;
    if (delta !== 0 && typeof nv.moveCrosshairInVox === 'function') {
      nv.moveCrosshairInVox(0, 0, delta);
      nv.drawScene?.();
    }
  }, [sliceIdx, ready]);

  if (error) {
    return (
      <div className="nifti-viewer nifti-viewer--error">
        <p className="nifti-viewer-error">{error}</p>
        <p className="nifti-viewer-hint">Place a .nii or .nii.gz file at sample_data/MRI/volume.nii.gz</p>
      </div>
    );
  }

  return (
    <div className="nifti-viewer">
      <div className="nifti-viewer-header">
        <span className="nifti-viewer-label">{label}</span>
        <span className="nifti-viewer-slice">Slice {sliceIdx + 1} / {sliceMax + 1}</span>
      </div>
      <div className="nifti-viewer-canvas-wrap">
        {loading && <div className="nifti-viewer-loading">Loading volume…</div>}
        <canvas ref={canvasRef} className="nifti-viewer-canvas" />
      </div>
      {ready && sliceMax > 0 && (
        <div className="nifti-viewer-controls">
          <input
            type="range"
            min={0}
            max={sliceMax}
            value={sliceIdx}
            onChange={(e) => setSliceIdx(Number(e.target.value))}
            className="nifti-viewer-slider"
          />
        </div>
      )}
    </div>
  );
}
