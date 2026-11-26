'use strict';

const config = require('../config/env');
const db = require('../db');
const AppError = require('../utils/app-error');

/** Responds 404 in the API's JSON shape for an unmatched /api route. */
function notFoundHandler(req, res, next) {
  next(AppError.notFound(`No API route matches ${req.method} ${req.originalUrl}`));
}

/**
 * Single place where an error becomes an HTTP response.
 *
 * Errors raised deliberately by the application (AppError) keep their status
 * and message. Anything else is logged in full on the server and reported as a
 * plain 500, so stack traces, SQL and driver details are never leaked.
 */
// eslint-disable-next-line no-unused-vars -- Express needs the 4-argument form
function errorHandler(error, req, res, next) {
  if (error instanceof AppError) {
    res.status(error.status).json({
      error: {
        message: error.message,
        ...(error.code ? { code: error.code } : {}),
        ...(error.details ? { details: error.details } : {}),
      },
    });
    return;
  }

  // Malformed JSON body: express.json() raises a SyntaxError with a status.
  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    res.status(400).json({
      error: { message: 'The request body is not valid JSON.', code: 'INVALID_JSON' },
    });
    return;
  }

  console.error(`[error] ${req.method} ${req.originalUrl}: ${db.describeError(error)}`);
  if (!config.isProduction && error.stack) console.error(error.stack);

  res.status(500).json({
    error: { message: 'An unexpected error occurred.', code: 'INTERNAL_ERROR' },
  });
}

module.exports = { notFoundHandler, errorHandler };
