const jwt = require('jsonwebtoken');
const { env } = require('../config/env');
const { query } = require('../db');
const { HttpError } = require('../utils/httpError');

const COOKIE_NAME = 'ai_assistant_session';

function buildAuthCookieOptions() {
  return {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: 'strict',
    maxAge: 1000 * 60 * 60 * 24 * 14,
    path: '/'
  };
}

function createSessionToken(user) {
  return jwt.sign(
    {
      sub: String(user.id),
      email: user.email,
      role: user.role
    },
    env.jwtSecret,
    { expiresIn: '14d' }
  );
}

function setSessionCookie(res, user) {
  res.cookie(COOKIE_NAME, createSessionToken(user), buildAuthCookieOptions());
}

function clearSessionCookie(res) {
  res.clearCookie(COOKIE_NAME, buildAuthCookieOptions());
}

async function requireAuth(req, _res, next) {
  try {
    const token = req.cookies[COOKIE_NAME];
    if (!token) {
      throw new HttpError(401, 'Authentication required.');
    }

    const payload = jwt.verify(token, env.jwtSecret);
    const result = await query(
      'SELECT id, name, email, role, is_active, created_at FROM users WHERE id = $1 LIMIT 1',
      [payload.sub]
    );

    if (result.rowCount === 0 || !result.rows[0].is_active) {
      throw new HttpError(401, 'Your session is no longer valid.');
    }

    req.user = result.rows[0];
    next();
  } catch (error) {
    next(error.name === 'JsonWebTokenError' ? new HttpError(401, 'Invalid session.') : error);
  }
}

function requireAdmin(req, _res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return next(new HttpError(403, 'Admin access is required.'));
  }
  return next();
}

module.exports = {
  COOKIE_NAME,
  buildAuthCookieOptions,
  createSessionToken,
  setSessionCookie,
  clearSessionCookie,
  requireAuth,
  requireAdmin
};
