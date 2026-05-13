# Techit AI Assistant MVP

This project is a production-oriented MVP for your private AI assistant at `https://ai.techittechnologies.com`.

It is designed for:

- `Node.js 17.0`
- `PostgreSQL 10.23`
- `Plesk` hosting
- `Ollama` as the default free/self-hosted AI provider
- `React + Vite 4` frontend with an `Express` backend

## What the MVP includes

- Secure admin bootstrap and login
- Chat sessions with saved history
- Assistant mode selection
- Streaming responses from Ollama
- URL knowledge ingestion
- Retrieval-augmented chat with source citations
- PostgreSQL schema and migration runner
- Environment template and Plesk deployment guidance

## Architecture

### Backend

- `Express 4` API
- Cookie-based auth using JWT in `HttpOnly` cookies
- `PostgreSQL` for users, chats, sources, and future-ready tables
- URL ingestion with `axios + cheerio`
- Retrieval using locally generated embeddings from Ollama
- Cosine similarity scoring in application code to avoid requiring `pgvector`

### Frontend

- `React 18`
- `Vite 4` for local development and production build output
- Clean chat UI with markdown rendering and copyable code blocks

## Project structure

```text
.
├── client/
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   ├── context/
│   │   ├── pages/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── styles.css
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── scripts/
│   └── migrate.js
├── src/
│   ├── config/
│   ├── db/
│   │   ├── index.js
│   │   └── migrations/
│   ├── middleware/
│   ├── routes/
│   ├── services/
│   ├── utils/
│   ├── app.js
│   └── server.js
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

## Local development setup

### 1. Create the PostgreSQL database

Example:

```sql
CREATE DATABASE techit_ai;
```

### 2. Install Ollama locally

Install Ollama on your development machine, then pull the recommended models:

```bash
ollama pull llama3.1:8b
ollama pull nomic-embed-text
```

You can swap these models later in `.env`.

### 3. Configure environment variables

Copy `.env.example` to `.env` and update:

```bash
cp .env.example .env
```

Required values:

- `DATABASE_URL`
- `JWT_SECRET`
- `SETUP_TOKEN`

Example PostgreSQL connection:

```env
DATABASE_URL=postgres://db_user:db_password@localhost:5432/techit_ai
```

### 4. Install dependencies

From the project root:

```bash
npm install
npm --prefix client install
```

### 5. Run migrations

```bash
npm run migrate
```

### 6. Start the app in development

```bash
npm run dev
```

App URLs:

- Frontend: `http://localhost:5173`
- API: `http://localhost:3001`

### 7. Bootstrap the first admin user

Open the app in the browser. The first screen will ask for:

- Name
- Email
- Password
- `SETUP_TOKEN` from your `.env`

That creates the initial admin account and signs you in.

## How the knowledge system works

1. You add a public URL in the Knowledge panel.
2. The backend fetches the page, extracts readable text, and removes noisy elements.
3. The text is chunked into smaller sections.
4. Each chunk is embedded using the Ollama embedding model.
5. Chunks and metadata are stored in PostgreSQL.
6. During chat, the latest user prompt is embedded.
7. The backend compares the prompt embedding against stored chunk embeddings.
8. Top matching chunks are injected into the model context as untrusted reference data.
9. Matching sources are returned to the UI as citations.

## API summary

### Auth

- `GET /api/auth/bootstrap-status`
- `POST /api/auth/bootstrap`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`

### Meta

- `GET /api/meta/assistant-modes`

### Chat

- `GET /api/chat/sessions`
- `POST /api/chat/sessions`
- `GET /api/chat/sessions/:sessionId/messages`
- `POST /api/chat/sessions/:sessionId/stream`

### Knowledge

- `GET /api/knowledge/sources`
- `POST /api/knowledge/sources/url`
- `DELETE /api/knowledge/sources/:sourceId`

## Deployment on Plesk

### Recommended deployment shape

Because Node.js `17.0` is old and many modern SSR stacks now expect Node 18+, this project uses a safer deployment path:

- Build the React frontend into static assets
- Run a single Express server on Plesk
- Let Express serve the built frontend from `client/dist`

### Plesk steps

1. Upload the project to your Plesk domain root for `ai.techittechnologies.com`.
2. In Plesk, set the Node.js application root to this project directory.
3. Set the startup file to:

```text
server.js
```

4. Set environment variables in Plesk:

- `NODE_ENV=production`
- `PORT` from the Plesk app assignment
- `DATABASE_URL`
- `DATABASE_SSL` if your database requires it
- `JWT_SECRET`
- `SETUP_TOKEN`
- `CLIENT_ORIGIN=https://ai.techittechnologies.com`
- `OLLAMA_BASE_URL`
- `OLLAMA_CHAT_MODEL`
- `OLLAMA_EMBED_MODEL`

5. Install server dependencies:

```bash
npm install --production
```

6. Install frontend dependencies and build:

```bash
npm run build
```

7. Run database migrations:

```bash
npm run migrate
```

8. Start or restart the Node.js app from Plesk.

## Ollama deployment note

Plesk shared hosting often does **not** allow running Ollama directly on the same server. In that case, use one of these options:

- Run Ollama on a separate VPS and point `OLLAMA_BASE_URL` to it.
- Run Ollama on a local machine or LAN box and use a secure reverse proxy or VPN.
- Replace the provider implementation later with another self-hosted OpenAI-compatible endpoint.

The code already isolates model access behind `src/services/ollama.service.js`, so switching providers later is straightforward.

## Security checklist

- Secrets stored only in environment variables
- `HttpOnly` auth cookies
- `SameSite=Strict` cookies
- Password hashing with `bcryptjs`
- Global rate limiting
- Helmet security headers
- URL validation with local-network blocking
- Strict backend-side ownership checks for sessions and sources
- Retrieved website content treated as untrusted prompt context
- Frontend markdown rendering without raw HTML execution

## Important compatibility notes

- `Next.js` was intentionally avoided for the MVP because current stable releases generally expect Node 18+.
- `Vite 4` is used instead of newer tooling because it remains compatible with Node 17.
- `pgvector` is not required, which avoids PostgreSQL extension issues on Plesk and PostgreSQL 10.
- The retrieval layer computes similarity in Node.js, which is simpler and more portable for an MVP.

## Suggested roadmap after MVP

### Phase 2

- File uploads for `PDF`, `DOCX`, `TXT`, `MD`, and `CSV`
- Notes, tasks, and reminders UI
- Admin settings page
- Better source management and re-indexing

### Phase 3

- Social media content tools
- Saved post library
- Content calendar
- More assistant modes and prompt controls

### Phase 4

- Multi-user admin dashboard
- Role-based user management
- OpenAI-compatible provider fallback support
- Background jobs for ingestion and re-embedding
