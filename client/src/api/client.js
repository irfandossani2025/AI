const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    ...options
  });

  if (response.status === 204) {
    return null;
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || 'Request failed.');
  }

  return data;
}

export async function getBootstrapStatus() {
  return request('/api/auth/bootstrap-status');
}

export async function bootstrapAdmin(payload) {
  return request('/api/auth/bootstrap', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function login(payload) {
  return request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function logout() {
  return request('/api/auth/logout', {
    method: 'POST'
  });
}

export async function fetchCurrentUser() {
  return request('/api/auth/me');
}

export async function fetchAssistantModes() {
  return request('/api/meta/assistant-modes');
}

export async function fetchSessions() {
  return request('/api/chat/sessions');
}

export async function createSession(assistantMode) {
  return request('/api/chat/sessions', {
    method: 'POST',
    body: JSON.stringify({ assistantMode })
  });
}

export async function fetchMessages(sessionId) {
  return request(`/api/chat/sessions/${sessionId}/messages`);
}

export async function fetchSources() {
  return request('/api/knowledge/sources');
}

export async function addUrlSource(payload) {
  return request('/api/knowledge/sources/url', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function deleteSource(sourceId) {
  return request(`/api/knowledge/sources/${sourceId}`, {
    method: 'DELETE'
  });
}

export async function streamChatMessage({ sessionId, message, onMeta, onToken, onDone }) {
  const response = await fetch(`${API_BASE_URL}/api/chat/sessions/${sessionId}/stream`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ message })
  });

  if (!response.ok || !response.body) {
    let payload = {};
    try {
      payload = await response.json();
    } catch (_error) {
      payload = {};
    }
    throw new Error(payload.error || 'Unable to start the streaming response.');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split('\n\n');
    buffer = events.pop() || '';

    for (const rawEvent of events) {
      const lines = rawEvent.split('\n').filter(Boolean);
      const eventName = lines.find((line) => line.startsWith('event:'))?.replace('event:', '').trim();
      const payloadLine = lines.find((line) => line.startsWith('data:'));
      if (!eventName || !payloadLine) {
        continue;
      }

      const data = JSON.parse(payloadLine.replace('data:', '').trim());

      if (eventName === 'meta' && onMeta) {
        onMeta(data);
      }
      if (eventName === 'token' && onToken) {
        onToken(data.token);
      }
      if (eventName === 'done' && onDone) {
        onDone(data);
      }
      if (eventName === 'error') {
        throw new Error(data.message || 'Streaming failed.');
      }
    }
  }
}
