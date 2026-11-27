'use strict';

const config = require('../config/env');
const userRepository = require('../repositories/user-repository');
const tokenService = require('../services/token-service');
const AppError = require('../utils/app-error');
const asyncHandler = require('./async-handler');

/**
 * Extracts the token from the request.
 *
 * Two transports are accepted. The browser frontend uses the httpOnly cookie,
 * which JavaScript cannot read. An API client such as Postman uses the
 * Authorization header, which is what the report's protocol section documents.
 */
function readToken(req) {
  const header = req.get('authorization');

  if (header && header.startsWith('Bearer ')) {
    return header.slice('Bearer '.length).trim();
  }

  return req.cookies?.[config.authCookieName] || null;
}

/**
 * Rejects the request unless it carries a valid token for an active user.
 *
 * The user row is re-read on every request rather than trusted from the token
 * payload, so a deactivated account or a changed role takes effect immediately
 * instead of when the token happens to expire.
 */
const requireAuth = asyncHandler(async (req, res, next) => {
  const token = readToken(req);

  if (!token) {
    throw AppError.unauthorized('You must sign in to do that.');
  }

  let claims;
  try {
    claims = tokenService.verify(token);
  } catch (error) {
    const message =
      error.name === 'TokenExpiredError'
        ? 'Your session has expired; please sign in again.'
        : 'Your session is not valid; please sign in again.';
    throw AppError.unauthorized(message);
  }

  const user = await userRepository.findById(claims.userId);

  if (!user || !user.is_active) {
    throw AppError.unauthorized('Your account is no longer active.');
  }

  req.user = user;
  next();
});

/**
 * Restricts a route to the given roles. Must be placed after requireAuth.
 *
 * 401 means "not signed in", 403 means "signed in but not allowed" - the
 * distinction matters because the frontend redirects on the first and shows an
 * error on the second.
 *
 * @param {...('member'|'librarian')} roles
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      next(AppError.unauthorized());
      return;
    }

    if (!roles.includes(req.user.role)) {
      next(AppError.forbidden('This action is restricted to library staff.'));
      return;
    }

    next();
  };
}

module.exports = { requireAuth, requireRole, readToken };
