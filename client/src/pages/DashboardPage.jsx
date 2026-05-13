import { useEffect, useState } from 'react';
import {
  addUrlSource,
  createSession,
  deleteSource,
  fetchAssistantModes,
  fetchMessages,
  fetchSessions,
  fetchSources,
  streamChatMessage
} from '../api/client';
import { useAuth } from '../context/AuthContext';
import { ChatPanel } from '../components/ChatPanel';
import { KnowledgePanel } from '../components/KnowledgePanel';
import { SessionSidebar } from '../components/SessionSidebar';

export function DashboardPage() {
  const { user, logout } = useAuth();
  const [assistantModes, setAssistantModes] = useState([]);
  const [selectedMode, setSelectedMode] = useState('personal-assistant');
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [sources, setSources] = useState([]);
  const [error, setError] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isSubmittingSource, setIsSubmittingSource] = useState(false);

  useEffect(() => {
    async function bootstrapDashboard() {
      try {
        const [modesResponse, sessionsResponse, sourcesResponse] = await Promise.all([
          fetchAssistantModes(),
          fetchSessions(),
          fetchSources()
        ]);

        setAssistantModes(modesResponse.modes);
        const personalMode = modesResponse.modes.find((mode) => mode.key === 'personal-assistant');
        if (personalMode) {
          setSelectedMode(personalMode.key);
        } else if (modesResponse.modes[0]) {
          setSelectedMode(modesResponse.modes[0].key);
        }

        setSessions(sessionsResponse.sessions);
        setSources(sourcesResponse.sources);

        if (sessionsResponse.sessions[0]) {
          setCurrentSessionId(sessionsResponse.sessions[0].id);
        }
      } catch (requestError) {
        setError(requestError.message);
      }
    }

    bootstrapDashboard();
  }, []);

  useEffect(() => {
    async function loadMessages() {
      if (!currentSessionId) {
        setMessages([]);
        return;
      }

      try {
        const response = await fetchMessages(currentSessionId);
        setMessages(response.messages);
      } catch (requestError) {
        setError(requestError.message);
      }
    }

    loadMessages();
  }, [currentSessionId]);

  async function handleCreateSession() {
    try {
      const response = await createSession(selectedMode);
      setSessions((current) => [response.session, ...current]);
      setCurrentSessionId(response.session.id);
      setMessages([]);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function handleSendMessage(content) {
    try {
      setError('');
      setIsStreaming(true);

      let sessionId = currentSessionId;
      if (!sessionId) {
        const response = await createSession(selectedMode);
        sessionId = response.session.id;
        setSessions((current) => [response.session, ...current]);
        setCurrentSessionId(sessionId);
      }

      const userMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content,
        citations: []
      };

      const assistantMessageId = `assistant-${Date.now()}`;
      let finalCitations = [];

      setMessages((current) => [
        ...current,
        userMessage,
        {
          id: assistantMessageId,
          role: 'assistant',
          content: '',
          citations: []
        }
      ]);

      await streamChatMessage({
        sessionId,
        message: content,
        onMeta(data) {
          finalCitations = data.citations || [];
        },
        onToken(token) {
          setMessages((current) =>
            current.map((message) =>
              message.id === assistantMessageId
                ? { ...message, content: `${message.content}${token}`, citations: finalCitations }
                : message
            )
          );
        },
        onDone(data) {
          finalCitations = data.citations || [];
          setMessages((current) =>
            current.map((message) =>
              message.id === assistantMessageId
                ? {
                    ...message,
                    content: data.content || message.content,
                    citations: finalCitations
                  }
                : message
            )
          );
          setSessions((current) =>
            current.map((session) =>
              session.id === sessionId
                ? { ...session, title: data.title || session.title, updated_at: new Date().toISOString() }
                : session
            )
          );
        }
      });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsStreaming(false);
    }
  }

  async function handleAddUrlSource(payload) {
    try {
      setError('');
      setIsSubmittingSource(true);
      const response = await addUrlSource(payload);
      setSources((current) => [
        {
          ...response.source
        },
        ...current
      ]);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSubmittingSource(false);
    }
  }

  async function handleDeleteSource(sourceId) {
    try {
      await deleteSource(sourceId);
      setSources((current) => current.filter((source) => source.id !== sourceId));
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  const currentSession = sessions.find((session) => session.id === currentSessionId);

  return (
    <div className="dashboard-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Signed in</p>
          <h1>{user?.name || 'Techit AI Assistant'}</h1>
        </div>
        <div className="topbar-actions">
          <span>{user?.email}</span>
          <button className="button secondary" type="button" onClick={logout}>
            Sign out
          </button>
        </div>
      </header>

      {error ? <div className="alert error">{error}</div> : null}

      <main className="dashboard-grid">
        <SessionSidebar
          sessions={sessions}
          currentSessionId={currentSessionId}
          assistantModes={assistantModes}
          selectedMode={selectedMode}
          onSelectMode={setSelectedMode}
          onCreateSession={handleCreateSession}
          onSelectSession={setCurrentSessionId}
        />

        <ChatPanel
          sessionTitle={currentSession?.title}
          messages={messages}
          onSendMessage={handleSendMessage}
          isStreaming={isStreaming}
        />

        <KnowledgePanel
          sources={sources}
          onAddUrl={handleAddUrlSource}
          onDeleteSource={handleDeleteSource}
          isSubmitting={isSubmittingSource}
        />
      </main>
    </div>
  );
}
