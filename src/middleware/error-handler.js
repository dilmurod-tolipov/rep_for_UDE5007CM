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

  // Body-parser rejections. These are client mistakes, not server faults, so
  // they must keep their own status instead of falling through to a 500.
  const bodyParserErrors = {
    'entity.parse.failed': [400, 'The request body is not valid JSON.', 'INVALID_JSON'],
    'entity.too.large': [413, 'The request body is too large.', 'PAYLOAD_TOO_LARGE'],
    'encoding.unsupported': [415, 'That content encoding is not supported.', 'UNSUPPORTED_ENCODING'],
    'request.aborted': [400, 'The request was aborted before it completed.', 'REQUEST_ABORTED'],
  };

  if (error.type && bodyParserErrors[error.type]) {
    const [status, message, code] = bodyParserErrors[error.type];
    res.status(status).json({ error: { message, code } });
    return;
  }

  console.error(`[error] ${req.method} ${req.originalUrl}: ${db.describeError(error)}`);
  if (!config.isProduction && error.stack) console.error(error.stack);

  res.status(500).json({
    error: { message: 'An unexpected error occurred.', code: 'INTERNAL_ERROR' },
  });
}

module.exports = { notFoundHandler, errorHandler };
