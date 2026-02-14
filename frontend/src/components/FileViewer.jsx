import { ImagingPanel } from './ImagingPanel.jsx';

const SCROLL_AMOUNT = 80;

export function FileViewer({ file, scrollContainerRef, imaging = null, imagingLoading = false, demoImaging = null }) {
  if (!file) {
    return (
      <div className="file-viewer empty">
        <p>Swipe left/right to navigate files</p>
        <p>1 finger = scroll up, 2 fingers = scroll down, 3 fingers = switch</p>
        <p>Close fist to hear summary</p>
      </div>
    );
  }
  const text = file.content || file.text || JSON.stringify(file, null, 2);
  const patientId = file.patientId;
  return (
    <div className="file-viewer">
      <h2>{file.title || file.patientId || 'Patient Record'}</h2>
      <div ref={scrollContainerRef} className="file-scroll-container">
        <pre className="file-content">{text}</pre>
        <ImagingPanel
          patientId={patientId}
          imaging={imaging}
          loading={imagingLoading}
          demoImaging={demoImaging}
        />
      </div>
    </div>
  );
}

export { SCROLL_AMOUNT };
