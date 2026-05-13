const express = require('express');
const { query } = require('../db');
const { requireAuth } = require('../middleware/auth');
const { asyncHandler } = require('../utils/asyncHandler');
const { ingestUrlSource } = require('../services/urlIngestion.service');
const { sanitizeTextInput } = require('../utils/security');
const { HttpError } = require('../utils/httpError');

const router = express.Router();

router.use(requireAuth);

router.get(
  '/sources',
  asyncHandler(async (req, res) => {
    const result = await query(
      `
        SELECT
          ks.id,
          ks.title,
          ks.source_url,
          ks.source_type,
          ks.status,
          ks.metadata,
          ks.created_at,
          COUNT(kc.id)::int AS chunk_count
        FROM knowledge_sources ks
        LEFT JOIN knowledge_chunks kc ON kc.source_id = ks.id
        WHERE ks.user_id = $1
        GROUP BY ks.id
        ORDER BY ks.created_at DESC
      `,
      [req.user.id]
    );

    res.json({ sources: result.rows });
  })
);

router.post(
  '/sources/url',
  asyncHandler(async (req, res) => {
    const title = req.body.title ? sanitizeTextInput(req.body.title, 255) : undefined;
    const result = await ingestUrlSource({
      userId: req.user.id,
      url: req.body.url,
      titleOverride: title
    });

    res.status(201).json({
      source: {
        id: result.source.id,
        title: result.source.title,
        source_url: result.source.source_url,
        created_at: result.source.created_at,
        chunk_count: result.chunkCount
      }
    });
  })
);

router.delete(
  '/sources/:sourceId',
  asyncHandler(async (req, res) => {
    const sourceId = Number.parseInt(req.params.sourceId, 10);
    if (Number.isNaN(sourceId)) {
      throw new HttpError(400, 'Invalid knowledge source id.');
    }

    await query('DELETE FROM knowledge_sources WHERE id = $1 AND user_id = $2', [sourceId, req.user.id]);
    res.status(204).send();
  })
);

module.exports = { knowledgeRoutes: router };
