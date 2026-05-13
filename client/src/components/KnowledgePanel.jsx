import { useState } from 'react';

export function KnowledgePanel({ sources, onAddUrl, onDeleteSource, isSubmitting }) {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    await onAddUrl({ url, title });
    setUrl('');
    setTitle('');
  }

  return (
    <aside className="knowledge-panel card">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Knowledge</p>
          <h2>Sources</h2>
        </div>
      </div>

      <form className="form-stack" onSubmit={handleSubmit}>
        <input
          className="input"
          placeholder="https://example.com/article"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
        />
        <input
          className="input"
          placeholder="Optional custom title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
        <button className="button primary" type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Learning...' : 'Learn URL'}
        </button>
      </form>

      <div className="source-list">
        {sources.length === 0 ? (
          <p className="empty-state">No knowledge sources yet. Add a trusted URL to begin retrieval.</p>
        ) : (
          sources.map((source) => (
            <div key={source.id} className="source-card">
              <div>
                <strong>{source.title}</strong>
                <p>{source.source_url || source.source_type}</p>
                <span>{source.chunk_count || source.metadata?.chunkCount || 0} chunks</span>
              </div>
              <button className="text-button" type="button" onClick={() => onDeleteSource(source.id)}>
                Remove
              </button>
            </div>
          ))
        )}
      </div>
    </aside>
  );
}
