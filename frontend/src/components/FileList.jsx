export function FileList({ files, current, onSelect, loading, onRefresh }) {
  return (
    <div className="file-list">
      <div className="file-list-header">
        <h3 className="file-list-title">Patient Files</h3>
        <button
          type="button"
          className="btn-refresh"
          onClick={onRefresh}
          disabled={loading}
          title="Refresh files"
        >
          {loading ? '…' : '↻'}
        </button>
      </div>
      <ul>
        {loading && files.length === 0 ? (
          <li className="empty">Loading…</li>
        ) : files.length === 0 ? (
          <li className="empty">
            No files in database.
            <br />
            <span className="hint">Run npm run seed:preop when MongoDB is reachable</span>
          </li>
        ) : (
          files.map((f) => (
            <li key={f._id}>
              <button
                className={`file-item ${current?._id === f._id ? 'active' : ''}`}
                onClick={() => onSelect(f)}
              >
                <span className="file-icon">♥</span>
                <span className="file-label">
                  {f.title || f.patientId || f._id?.slice(-6) || 'Untitled'}
                </span>
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
