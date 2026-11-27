'use strict';

const db = require('../db');

/**
 * Columns that may be sent to a client. The password hash is never selected
 * except by the explicit credential lookup used at login.
 */
const PUBLIC_COLUMNS = 'id, full_name, email, role, is_active, created_at';

/**
 * Finds a user by email, case-insensitively.
 * @param {string} email
 */
function findByEmail(email) {
  return db.queryOne(
    `SELECT ${PUBLIC_COLUMNS} FROM users WHERE lower(email) = lower($1)`,
    [email],
  );
}

/**
 * Loads the columns needed to authenticate a login attempt, including the
 * password hash. This is the only query that selects the hash; everything else
 * uses PUBLIC_COLUMNS so it cannot be returned by accident.
 *
 * @param {string} email
 */
function findCredentialsByEmail(email) {
  return db.queryOne(
    `SELECT id, full_name, email, role, is_active, password_hash, created_at
       FROM users
      WHERE lower(email) = lower($1)`,
    [email],
  );
}

/**
 * Finds a user by id.
 * @param {number} id
 */
function findById(id) {
  return db.queryOne(`SELECT ${PUBLIC_COLUMNS} FROM users WHERE id = $1`, [id]);
}

/**
 * Inserts a new user and returns the public representation.
 *
 * The role is a parameter of this function rather than of the HTTP request:
 * the registration endpoint always passes 'member', so a client cannot grant
 * itself librarian rights by adding a field to the request body.
 *
 * @param {{ fullName: string, email: string, passwordHash: string, role?: 'member'|'librarian' }} input
 */
function create({ fullName, email, passwordHash, role = 'member' }) {
  return db.queryOne(
    `INSERT INTO users (full_name, email, password_hash, role)
          VALUES ($1, $2, $3, $4)
       RETURNING ${PUBLIC_COLUMNS}`,
    [fullName, email, passwordHash, role],
  );
}

/** True when the error is a unique-violation on the email index. */
function isDuplicateEmail(error) {
  return error && error.code === '23505' && String(error.constraint).includes('email');
}

module.exports = {
  findByEmail,
  findCredentialsByEmail,
  findById,
  create,
  isDuplicateEmail,
  PUBLIC_COLUMNS,
};
