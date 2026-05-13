const express = require('express');
const bcrypt = require('bcryptjs');
const { query } = require('../db');
const { asyncHandler } = require('../utils/asyncHandler');
const { HttpError } = require('../utils/httpError');
const { sanitizeTextInput, validateEmail, validatePassword } = require('../utils/security');
const { clearSessionCookie, requireAuth, setSessionCookie } = require('../middleware/auth');
const { env } = require('../config/env');

const router = express.Router();

router.get(
  '/bootstrap-status',
  asyncHandler(async (_req, res) => {
    const result = await query('SELECT COUNT(*)::int AS count FROM users');
    res.json({ requiresBootstrap: result.rows[0].count === 0 });
  })
);

router.post(
  '/bootstrap',
  asyncHandler(async (req, res) => {
    const existingUsers = await query('SELECT COUNT(*)::int AS count FROM users');
    if (existingUsers.rows[0].count > 0) {
      throw new HttpError(409, 'Bootstrap has already been completed.');
    }

    const setupToken = sanitizeTextInput(req.body.setupToken, 255);
    if (setupToken !== env.setupToken) {
      throw new HttpError(403, 'The setup token is invalid.');
    }

    const name = sanitizeTextInput(req.body.name, 120);
    const email = validateEmail(req.body.email);
    const password = validatePassword(req.body.password);
    const passwordHash = await bcrypt.hash(password, 12);

    const result = await query(
      `
        INSERT INTO users (name, email, password_hash, role)
        VALUES ($1, $2, $3, 'admin')
        RETURNING id, name, email, role, created_at
      `,
      [name, email, passwordHash]
    );

    const user = result.rows[0];
    setSessionCookie(res, user);
    res.status(201).json({ user });
  })
);

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const email = validateEmail(req.body.email);
    const password = validatePassword(req.body.password);
    const result = await query(
      'SELECT id, name, email, role, password_hash, is_active, created_at FROM users WHERE email = $1 LIMIT 1',
      [email]
    );

    if (result.rowCount === 0) {
      throw new HttpError(401, 'Invalid email or password.');
    }

    const user = result.rows[0];
    const matches = await bcrypt.compare(password, user.password_hash);
    if (!matches || !user.is_active) {
      throw new HttpError(401, 'Invalid email or password.');
    }

    setSessionCookie(res, user);
    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        created_at: user.created_at
      }
    });
  })
);

router.post(
  '/logout',
  asyncHandler(async (_req, res) => {
    clearSessionCookie(res);
    res.status(204).send();
  })
);

router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ user: req.user });
  })
);

module.exports = { authRoutes: router };
