const axios = require('axios');
const cheerio = require('cheerio');
const { query, getClient } = require('../db');
const { env } = require('../config/env');
const { embedText } = require('./ollama.service');
const { HttpError } = require('../utils/httpError');
const { chunkText, estimateTokens, sanitizeTextInput, validatePublicUrl } = require('../utils/security');

function extractReadableText(html) {
  const $ = cheerio.load(html);
  $('script, style, noscript, iframe, svg, form, nav, footer').remove();

  const title =
    $('meta[property="og:title"]').attr('content') ||
    $('meta[name="twitter:title"]').attr('content') ||
    $('title').first().text() ||
    $('h1').first().text() ||
    'Untitled source';

  const blocks = [];
  $('article, main, h1, h2, h3, p, li, blockquote').each((_index, element) => {
    const text = $(element).text().replace(/\s+/g, ' ').trim();
    if (text && text.length > 35) {
      blocks.push(text);
    }
  });

  const combinedText = blocks.join('\n\n').slice(0, env.knowledgeCharLimit);
  if (!combinedText) {
    throw new HttpError(400, 'The URL did not contain enough readable text to ingest.');
  }

  return {
    title: sanitizeTextInput(title, 255),
    text: combinedText
  };
}

async function fetchUrlSource(url) {
  try {
    const response = await axios.get(url, {
      timeout: 20000,
      maxRedirects: 5,
      headers: {
        'User-Agent': 'TechitAIKnowledgeBot/1.0 (+https://ai.techittechnologies.com)'
      }
    });

    const contentType = String(response.headers['content-type'] || '');
    if (!contentType.includes('text/html')) {
      throw new HttpError(400, 'Only HTML web pages can be ingested in the MVP URL flow.');
    }

    return extractReadableText(response.data);
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }
    throw new HttpError(400, `Unable to fetch the provided URL. ${error.message}`);
  }
}

async function storeKnowledgeSource({ userId, sourceType, title, sourceUrl, rawText, metadata }) {
  const client = await getClient();

  try {
    await client.query('BEGIN');

    const sourceResult = await client.query(
      `
        INSERT INTO knowledge_sources (user_id, source_type, title, source_url, raw_text, metadata)
        VALUES ($1, $2, $3, $4, $5, $6::jsonb)
        RETURNING id, title, source_url, created_at
      `,
      [userId, sourceType, title, sourceUrl, rawText, metadata]
    );

    const source = sourceResult.rows[0];
    const chunks = chunkText(rawText);

    for (let index = 0; index < chunks.length; index += 1) {
      const content = chunks[index];
      const embedding = await embedText(content);
      await client.query(
        `
          INSERT INTO knowledge_chunks (source_id, user_id, chunk_index, content, token_estimate, embedding)
          VALUES ($1, $2, $3, $4, $5, $6::jsonb)
        `,
        [source.id, userId, index, content, estimateTokens(content), JSON.stringify(embedding)]
      );
    }

    await client.query(
      `
        UPDATE knowledge_sources
        SET metadata = jsonb_set(metadata, '{chunkCount}', to_jsonb($2::int), true),
            updated_at = NOW()
        WHERE id = $1
      `,
      [source.id, chunks.length]
    );

    await client.query('COMMIT');
    return { source, chunkCount: chunks.length };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function ingestUrlSource({ userId, url, titleOverride }) {
  const normalizedUrl = validatePublicUrl(url);

  const existing = await query(
    'SELECT id FROM knowledge_sources WHERE user_id = $1 AND source_url = $2 LIMIT 1',
    [userId, normalizedUrl]
  );

  if (existing.rowCount > 0) {
    throw new HttpError(409, 'This URL has already been learned.');
  }

  const readable = await fetchUrlSource(normalizedUrl);
  const title = titleOverride ? sanitizeTextInput(titleOverride, 255) : readable.title;

  return storeKnowledgeSource({
    userId,
    sourceType: 'url',
    title,
    sourceUrl: normalizedUrl,
    rawText: readable.text,
    metadata: JSON.stringify({
      wordCount: readable.text.split(/\s+/).filter(Boolean).length
    })
  });
}

module.exports = {
  ingestUrlSource
};
