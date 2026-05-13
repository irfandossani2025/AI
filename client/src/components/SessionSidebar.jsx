export function SessionSidebar({
  sessions,
  currentSessionId,
  assistantModes,
  selectedMode,
  onSelectMode,
  onCreateSession,
  onSelectSession
}) {
  return (
    <aside className="sidebar card">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Assistant</p>
          <h2>Chats</h2>
        </div>
        <button className="button secondary" type="button" onClick={onCreateSession}>
          New chat
        </button>
      </div>

      <label className="field-label" htmlFor="assistant-mode">
        Assistant mode
      </label>
      <select
        id="assistant-mode"
        className="input"
        value={selectedMode}
        onChange={(event) => onSelectMode(event.target.value)}
      >
        {assistantModes.map((mode) => (
          <option key={mode.key} value={mode.key}>
            {mode.label}
          </option>
        ))}
      </select>

      <div className="session-list">
        {sessions.length === 0 ? (
          <p className="empty-state">No chats yet. Start the first one from the button above.</p>
        ) : (
          sessions.map((session) => (
            <button
              key={session.id}
              type="button"
              className={`session-item ${currentSessionId === session.id ? 'active' : ''}`}
              onClick={() => onSelectSession(session.id)}
            >
              <strong>{session.title}</strong>
              <span>{session.assistant_mode.replace(/-/g, ' ')}</span>
            </button>
          ))
        )}
      </div>
    </aside>
  );
}
