/** Parses text with **bold** markers and renders as emphasis. */
function EmphasizedText({ text }) {
  if (!text || typeof text !== 'string') return null;
  const parts = [];
  let remaining = text;
  let key = 0;
  while (remaining.length > 0) {
    const match = remaining.match(/\*\*([^*]+)\*\*/);
    if (match) {
      const idx = remaining.indexOf(match[0]);
      if (idx > 0) parts.push(<span key={key++}>{remaining.slice(0, idx)}</span>);
      parts.push(<strong key={key++}>{match[1]}</strong>);
      remaining = remaining.slice(idx + match[0].length);
    } else {
      parts.push(<span key={key++}>{remaining}</span>);
      break;
    }
  }
  return <>{parts}</>;
}

export function SummaryPanel({ summary, loading, patientName, isPlayingAudio, onPlayAudioClick }) {
  const AudioStatusBar = () => (
    <div className={`summary-audio-status ${isPlayingAudio ? 'summary-audio-status--active' : ''}`}>
      <span>{isPlayingAudio ? '🔊 Reading aloud' : 'Closed fist to hear'}</span>
      {onPlayAudioClick && (
        <button type="button" className="summary-play-btn" onClick={onPlayAudioClick} aria-label="Play audio (test)">
          🔊 Play
        </button>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="summary-panel">
        <AudioStatusBar />
        <h3>Patient Summary</h3>
        {patientName && <p className="summary-patient">{patientName}</p>}
        <div className="summary-loading">Analyzing with Gemini…</div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="summary-panel">
        <AudioStatusBar />
        <h3>Patient Summary</h3>
        {patientName && <p className="summary-patient">{patientName}</p>}
        <p className="summary-empty">Summary loads automatically. Close your fist to hear it read aloud.</p>
      </div>
    );
  }

  const s = summary.summary || summary;
  const err = summary.error || s?.error;

  if (err) {
    return (
      <div className="summary-panel">
        <AudioStatusBar />
        <h3>Patient Summary</h3>
        {patientName && <p className="summary-patient">{patientName}</p>}
        <p className="summary-error">{err}</p>
        <p className="summary-error-hint">Select another file to retry. Close fist to hear this message read aloud.</p>
      </div>
    );
  }

  return (
    <div className="summary-panel">
      <AudioStatusBar />
      <h3>Patient Summary</h3>
      {patientName && <p className="summary-patient">{patientName}</p>}
      {s.keyFindings?.length > 0 && (
        <ul className="key-findings">
          {s.keyFindings.map((f, i) => (
            <li key={i}><EmphasizedText text={f} /></li>
          ))}
        </ul>
      )}
      {s.abnormalVitals?.length > 0 && (
        <div className="abnormal">
          <strong>Abnormal vitals:</strong>
          <ul>
            {s.abnormalVitals.map((v, i) => (
              <li key={i}><EmphasizedText text={v} /></li>
            ))}
          </ul>
        </div>
      )}
      {s.coreMetrics && Object.keys(s.coreMetrics).length > 0 && (
        <div className="core-metrics">
          <strong>Core metrics:</strong>
          <dl>
            {Object.entries(s.coreMetrics).map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd><EmphasizedText text={String(v)} /></dd>
              </div>
            ))}
          </dl>
        </div>
      )}
      {s.verbalSummary && (
        <div className="verbal-summary">
          <p><EmphasizedText text={s.verbalSummary} /></p>
        </div>
      )}
    </div>
  );
}
