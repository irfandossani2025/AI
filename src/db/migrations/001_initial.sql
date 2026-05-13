CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(200) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role VARCHAR(40) NOT NULL DEFAULT 'admin',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS assistant_profiles (
  id BIGSERIAL PRIMARY KEY,
  key VARCHAR(60) NOT NULL UNIQUE,
  label VARCHAR(120) NOT NULL,
  description TEXT NOT NULL,
  system_prompt TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_sessions (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL DEFAULT 'New chat',
  assistant_mode VARCHAR(60) NOT NULL DEFAULT 'personal-assistant',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id BIGSERIAL PRIMARY KEY,
  session_id BIGINT NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('system', 'user', 'assistant')),
  content TEXT NOT NULL,
  citations JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS knowledge_sources (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_type VARCHAR(20) NOT NULL CHECK (source_type IN ('url', 'note', 'file')),
  title VARCHAR(255) NOT NULL,
  source_url TEXT,
  raw_text TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'ready',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS knowledge_chunks (
  id BIGSERIAL PRIMARY KEY,
  source_id BIGINT NOT NULL REFERENCES knowledge_sources(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  token_estimate INTEGER NOT NULL DEFAULT 0,
  embedding JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (source_id, chunk_index)
);

CREATE TABLE IF NOT EXISTS tasks (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  details TEXT NOT NULL DEFAULT '',
  status VARCHAR(20) NOT NULL DEFAULT 'open',
  due_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notes (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reminders (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL DEFAULT '',
  remind_at TIMESTAMPTZ NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS saved_posts (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform VARCHAR(40) NOT NULL,
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS app_settings (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  key VARCHAR(120) NOT NULL,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, key)
);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions (user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages (session_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_knowledge_sources_user_id ON knowledge_sources (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_user_id ON knowledge_chunks (user_id);

INSERT INTO assistant_profiles (key, label, description, system_prompt)
VALUES
  (
    'personal-assistant',
    'Personal Assistant',
    'Handles daily organization, reminders, planning, and practical support.',
    'You are a deeply helpful personal assistant. Be organized, practical, concise, and action-oriented. When useful, propose next steps, checklists, or short templates.'
  ),
  (
    'full-stack-developer',
    'Full-Stack Developer',
    'Helps with planning, coding, debugging, architecture, schemas, and deployment.',
    'You are a senior full-stack developer and software architect. Give technically accurate answers, explain tradeoffs clearly, and prefer production-ready patterns that fit the user''s stack.'
  ),
  (
    'social-media-manager',
    'Social Media Manager',
    'Creates platform-specific posts, hooks, calendars, and repurposed content.',
    'You are a social media strategist. Optimize copy for engagement, audience fit, and platform conventions. Provide concise alternatives when helpful.'
  ),
  (
    'content-creator',
    'Content Creator',
    'Drafts articles, scripts, outlines, captions, and content ideas.',
    'You are a creative content partner. Make content structured, clear, and adaptable to multiple channels while preserving the user''s voice.'
  ),
  (
    'branding-consultant',
    'Branding Consultant',
    'Supports messaging, positioning, and brand voice decisions.',
    'You are a branding consultant. Focus on positioning clarity, audience resonance, and differentiated messaging.'
  ),
  (
    'business-email-writer',
    'Business Email Writer',
    'Writes polished emails, proposals, and follow-up messages.',
    'You are an expert business communication assistant. Write clear, polished, concise drafts with the right tone for professional settings.'
  ),
  (
    'research-assistant',
    'Research Assistant',
    'Summarizes sources, compares information, and extracts findings.',
    'You are a research assistant. Synthesize information clearly, note uncertainty, and cite the supporting sources provided in context.'
  )
ON CONFLICT (key) DO UPDATE
SET
  label = EXCLUDED.label,
  description = EXCLUDED.description,
  system_prompt = EXCLUDED.system_prompt;
