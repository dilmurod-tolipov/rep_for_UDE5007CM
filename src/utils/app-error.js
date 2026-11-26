'use strict';

/**
 * An error that is safe to show the client, carrying the HTTP status to use.
 *
 * Anything thrown that is *not* an AppError is treated as an unexpected fault
 * by the error handler and reported as a generic 500, so internal details such
 * as SQL fragments never reach the response body.
 */
class AppError extends Error {
  /**
   * @param {number} status HTTP status code
   * @param {string} message client-safe message
   * @param {object} [options]
   * @param {string} [options.code] stable machine-readable code
   * @param {Array<object>} [options.details] per-field validation details
   */
  constructor(status, message, { code, details } = {}) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code || null;
    this.details = details || null;
  }

  static badRequest(message, options) {
    return new AppError(400, message, options);
  }

  static unauthorized(message = 'Authentication required.') {
    return new AppError(401, message, { code: 'UNAUTHENTICATED' });
  }

  static forbidden(message = 'You do not have permission to do that.') {
    return new AppError(403, message, { code: 'FORBIDDEN' });
  }

  static notFound(message = 'Resource not found.') {
    return new AppError(404, message, { code: 'NOT_FOUND' });
  }

  static conflict(message, options) {
    return new AppError(409, message, { code: 'CONFLICT', ...options });
  }

  static validation(details) {
    return new AppError(422, 'The submitted data is not valid.', {
      code: 'VALIDATION_FAILED',
      details,
    });
  }
}

module.exports = AppError;
