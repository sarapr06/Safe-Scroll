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
        <p className="summary-empty">AI summary loading…</p>
      </div>
    );
  }

  const s = summary.summary || summary;
  const err = summary.error || s?.error;
  const fixUnavailable = (t) => (typeof t === 'string' ? t.replace(/AI unavailable/gi, 'loading') : t);

  if (err) {
    return (
      <div className="summary-panel">
        <AudioStatusBar />
        <h3>Patient Summary</h3>
        {patientName && <p className="summary-patient">{patientName}</p>}
        <p className="summary-error">{fixUnavailable(err)}</p>
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
            <li key={i}>{fixUnavailable(f)}</li>
          ))}
        </ul>
      )}
      {s.abnormalVitals?.length > 0 && (
        <div className="abnormal">
          <strong>Abnormal vitals:</strong>
          <ul>
            {s.abnormalVitals.map((v, i) => (
              <li key={i}>{v}</li>
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
                <dd>{String(v)}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
      {s.verbalSummary && (
        <div className="verbal-summary">
          <p>{fixUnavailable(s.verbalSummary)}</p>
        </div>
      )}
    </div>
  );
}
