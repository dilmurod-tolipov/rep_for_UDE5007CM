'use strict';

const ms = require('../utils/ms');
const userRepository = require('../repositories/user-repository');
const passwordService = require('../services/password-service');
const tokenService = require('../services/token-service');
const config = require('../config/env');
const AppError = require('../utils/app-error');

// Compared against when no account matches, so a login attempt costs the same
// whether or not the email exists (see login below).
const DUMMY_HASH = '$2b$12$C6UzMDM.H6dfI/f/IKcEe.aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

/**
 * POST /api/auth/register
 *
 * Creates a library member account.
 *
 * Request body: { fullName, email, password }
 * Responses:
 *   201 Created        { user: { id, fullName, email, role, createdAt } }
 *   409 Conflict       the email is already registered
 *   422 Unprocessable  a field failed validation (details list the fields)
 */
async function register(req, res) {
  const { fullName, email, password } = req.body;

  // Checked up front so the common case gives a clear message. The unique
  // index is still the real guarantee: between this check and the INSERT two
  // concurrent requests could both pass, which the catch below handles.
  const existing = await userRepository.findByEmail(email);
  if (existing) {
    throw AppError.conflict('An account with that email address already exists.');
  }

  const passwordHash = await passwordService.hash(password);

  let user;
  try {
    // role is not taken from the request body: self-registration always
    // produces a member, never a librarian.
    user = await userRepository.create({ fullName, email, passwordHash, role: 'member' });
  } catch (error) {
    if (userRepository.isDuplicateEmail(error)) {
      throw AppError.conflict('An account with that email address already exists.');
    }
    throw error;
  }

  res.status(201).json({ user: toPublicUser(user) });
}

/**
 * POST /api/auth/login
 *
 * Exchanges an email and password for a signed JWT. The token is set as an
 * httpOnly cookie for the browser and also returned in the body for API
 * clients such as Postman.
 *
 * Request body: { email, password }
 * Responses:
 *   200 OK           { user, token, expiresAt }
 *   401 Unauthorized the email or the password is wrong, or the account is
 *                    disabled - all answered with one generic message
 *   422 Unprocessable a field was missing or malformed
 */
async function login(req, res) {
  const { email, password } = req.body;

  const account = await userRepository.findCredentialsByEmail(email);

  // The same message and the same amount of work for a missing account and a
  // wrong password: a different response or a faster reply would let an
  // attacker enumerate which email addresses are registered.
  const passwordMatches = await passwordService.verify(
    password,
    account ? account.password_hash : DUMMY_HASH,
  );

  if (!account || !passwordMatches) {
    throw AppError.unauthorized('Email address or password is incorrect.');
  }

  if (!account.is_active) {
    throw AppError.unauthorized('Email address or password is incorrect.');
  }

  const token = tokenService.sign(account);
  const maxAgeMs = ms(config.jwtExpiresIn);

  res.cookie(config.authCookieName, token, tokenService.cookieOptions(maxAgeMs));

  res.status(200).json({
    user: toPublicUser(account),
    token,
    expiresAt: new Date(Date.now() + maxAgeMs).toISOString(),
  });
}

/**
 * POST /api/auth/logout
 *
 * Clears the authentication cookie. A JWT cannot be revoked server-side
 * without extra state, so "signing out" means discarding the credential: the
 * cookie is removed and a bearer-token client simply stops sending it. Token
 * lifetime is kept short (2 hours by default) to limit the window in which a
 * leaked token remains usable.
 *
 * Always answers 200, so the frontend can call it unconditionally.
 */
async function logout(req, res) {
  res.clearCookie(config.authCookieName, { ...tokenService.cookieOptions(0), maxAge: undefined });
  res.status(200).json({ message: 'Signed out.' });
}

/**
 * GET /api/auth/me
 *
 * Returns the signed-in user. The frontend calls this on page load to decide
 * what to render, because it cannot read the httpOnly cookie itself.
 *
 * Responses: 200 OK { user } | 401 Unauthorized
 */
async function me(req, res) {
  res.status(200).json({ user: toPublicUser(req.user) });
}

/** Maps a database row to the camelCase shape the API exposes. */
function toPublicUser(row) {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    role: row.role,
    createdAt: row.created_at,
  };
}

module.exports = { register, login, logout, me, toPublicUser };
