const express = require('express');
const { query } = require('../db');
const { asyncHandler } = require('../utils/asyncHandler');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get(
  '/assistant-modes',
  requireAuth,
  asyncHandler(async (_req, res) => {
    const result = await query(
      'SELECT key, label, description FROM assistant_profiles ORDER BY label ASC'
    );
    res.json({ modes: result.rows });
  })
);

module.exports = { metaRoutes: router };
