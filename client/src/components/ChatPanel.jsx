import { useState } from 'react';
import { MarkdownMessage } from './MarkdownMessage';

function CitationList({ citations }) {
  if (!citations || citations.length === 0) {
    return null;
  }

  return (
    <div className="citation-list">
      {citations.map((citation) => (
        <a
          key={`${citation.sourceId}-${citation.label}`}
          className="citation-chip"
          href={citation.url || '#'}
          target={citation.url ? '_blank' : undefined}
          rel={citation.url ? 'noreferrer' : undefined}
        >
          {citation.label}: {citation.title}
        </a>
      ))}
    </div>
  );
}

export function ChatPanel({ sessionTitle, messages, onSendMessage, isStreaming }) {
  const [draft, setDraft] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    if (!draft.trim()) {
      return;
    }

    const message = draft;
    setDraft('');
    await onSendMessage(message);
  }

  return (
    <section className="chat-panel card">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Conversation</p>
          <h2>{sessionTitle || 'New chat'}</h2>
        </div>
      </div>

      <div className="messages">
        {messages.length === 0 ? (
          <div className="empty-chat">
            <h3>Start with a focused request</h3>
            <p>Try asking for code help, a research summary, or a response grounded in one of your learned URLs.</p>
          </div>
        ) : (
          messages.map((message) => (
            <article key={message.id} className={`message-card ${message.role}`}>
              <div className="message-meta">
                <span>{message.role === 'assistant' ? 'Assistant' : 'You'}</span>
              </div>
              <div className="message-body">
                {message.role === 'assistant' ? (
                  <MarkdownMessage content={message.content} />
                ) : (
                  <p>{message.content}</p>
                )}
              </div>
              <CitationList citations={message.citations} />
            </article>
          ))
        )}
      </div>

      <form className="composer" onSubmit={handleSubmit}>
        <textarea
          className="input composer-input"
          placeholder="Ask your assistant anything..."
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          rows={4}
          disabled={isStreaming}
        />
        <button className="button primary" type="submit" disabled={isStreaming}>
          {isStreaming ? 'Thinking...' : 'Send'}
        </button>
      </form>
    </section>
  );
}
