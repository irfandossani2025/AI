const axios = require('axios');
const { env } = require('../config/env');
const { HttpError } = require('../utils/httpError');

function normalizeChatMessages(messages) {
  return messages
    .filter((message) => message && message.role && message.content)
    .map((message) => ({
      role: message.role,
      content: message.content
    }));
}

async function embedText(input) {
  const text = Array.isArray(input) ? input.join('\n\n') : String(input || '');

  try {
    const response = await axios.post(
      `${env.ollamaBaseUrl}/api/embed`,
      {
        model: env.ollamaEmbedModel,
        input: text
      },
      {
        timeout: 120000
      }
    );

    if (Array.isArray(response.data.embeddings) && response.data.embeddings[0]) {
      return response.data.embeddings[0];
    }

    if (Array.isArray(response.data.embedding)) {
      return response.data.embedding;
    }
  } catch (error) {
    const statusCode = error.response ? error.response.status : null;
    if (statusCode !== 404) {
      throw new HttpError(502, `Embedding request failed: ${error.message}`);
    }
  }

  try {
    const response = await axios.post(
      `${env.ollamaBaseUrl}/api/embeddings`,
      {
        model: env.ollamaEmbedModel,
        prompt: text
      },
      {
        timeout: 120000
      }
    );

    if (Array.isArray(response.data.embedding)) {
      return response.data.embedding;
    }
  } catch (error) {
    throw new HttpError(
      502,
      `Ollama embedding model "${env.ollamaEmbedModel}" is unavailable or returned an invalid response. ${error.message}`
    );
  }

  throw new HttpError(502, 'Ollama did not return a usable embedding vector.');
}

async function streamChat({ messages, onToken }) {
  const normalizedMessages = normalizeChatMessages(messages);

  let response;
  try {
    response = await axios.post(
      `${env.ollamaBaseUrl}/api/chat`,
      {
        model: env.ollamaChatModel,
        stream: true,
        messages: normalizedMessages
      },
      {
        responseType: 'stream',
        timeout: 0
      }
    );
  } catch (error) {
    throw new HttpError(
      502,
      `Ollama chat model "${env.ollamaChatModel}" is unavailable. ${error.message}`
    );
  }

  const stream = response.data;

  return new Promise((resolve, reject) => {
    let buffer = '';
    let fullText = '';

    stream.on('data', (chunk) => {
      buffer += chunk.toString('utf8');
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) {
          continue;
        }

        try {
          const parsed = JSON.parse(line);
          const token = parsed.message && typeof parsed.message.content === 'string' ? parsed.message.content : '';

          if (token) {
            fullText += token;
            onToken(token);
          }

          if (parsed.done) {
            resolve(fullText.trim());
          }
        } catch (error) {
          reject(new HttpError(502, `Unable to parse Ollama stream: ${error.message}`));
        }
      }
    });

    stream.on('end', () => resolve(fullText.trim()));
    stream.on('error', (error) => reject(new HttpError(502, `Ollama streaming failed: ${error.message}`)));
  });
}

module.exports = {
  embedText,
  streamChat
};
