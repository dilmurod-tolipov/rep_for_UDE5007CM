'use strict';

const userRepository = require('../repositories/user-repository');
const passwordService = require('../services/password-service');
const AppError = require('../utils/app-error');

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

module.exports = { register, toPublicUser };
