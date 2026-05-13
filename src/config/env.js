const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

function readEnv(name, fallback) {
  const value = process.env[name];
  if (value === undefined || value === '') {
    return fallback;
  }
  return value;
}

function readRequiredEnv(name) {
  const value = readEnv(name);
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function readIntEnv(name, fallback) {
  const value = readEnv(name, fallback);
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    throw new Error(`Environment variable ${name} must be an integer`);
  }
  return parsed;
}

const env = {
  nodeEnv: readEnv('NODE_ENV', 'development'),
  port: readIntEnv('PORT', '3001'),
  clientOrigin: readEnv('CLIENT_ORIGIN', 'http://localhost:5173'),
  databaseUrl: readRequiredEnv('DATABASE_URL'),
  databaseSsl: readEnv('DATABASE_SSL', 'false') === 'true',
  jwtSecret: readRequiredEnv('JWT_SECRET'),
  setupToken: readRequiredEnv('SETUP_TOKEN'),
  ollamaBaseUrl: readEnv('OLLAMA_BASE_URL', 'http://127.0.0.1:11434').replace(/\/$/, ''),
  ollamaChatModel: readEnv('OLLAMA_CHAT_MODEL', 'llama3.1:8b'),
  ollamaEmbedModel: readEnv('OLLAMA_EMBED_MODEL', 'nomic-embed-text'),
  maxContextChunks: readIntEnv('MAX_CONTEXT_CHUNKS', '5'),
  knowledgeCharLimit: readIntEnv('KNOWLEDGE_CHAR_LIMIT', '50000'),
  isProduction: readEnv('NODE_ENV', 'development') === 'production'
};

module.exports = { env };
