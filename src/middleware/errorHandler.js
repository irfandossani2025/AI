const { HttpError } = require('../utils/httpError');

function notFoundHandler(_req, _res, next) {
  next(new HttpError(404, 'The requested resource was not found.'));
}

function errorHandler(error, _req, res, _next) {
  const statusCode = error.statusCode || 500;
  const payload = {
    error: error.message || 'Unexpected server error.'
  };

  if (error.details) {
    payload.details = error.details;
  }

  if (statusCode >= 500) {
    console.error(error);
  }

  res.status(statusCode).json(payload);
}

module.exports = {
  notFoundHandler,
  errorHandler
};
