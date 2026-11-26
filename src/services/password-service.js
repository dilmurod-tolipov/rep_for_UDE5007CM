'use strict';

const bcrypt = require('bcryptjs');

const config = require('../config/env');

/**
 * Password hashing.
 *
 * bcrypt is used rather than a plain digest such as SHA-256 because it is
 * deliberately slow and salted: every hash embeds a unique random salt, so
 * identical passwords produce different hashes and pre-computed rainbow tables
 * are useless. The cost factor sets how slow; it can be raised as hardware
 * improves without invalidating existing hashes, because the cost is stored
 * inside the hash string itself.
 */

// bcrypt truncates anything past 72 bytes, so longer input is rejected at
// validation rather than being silently cut short.
const MAX_PASSWORD_BYTES = 72;

/**
 * @param {string} plainPassword
 * @returns {Promise<string>} the bcrypt hash, including algorithm, cost and salt
 */
function hash(plainPassword) {
  return bcrypt.hash(plainPassword, config.bcryptRounds);
}

/**
 * Compares a candidate password against a stored hash in constant time.
 * @param {string} plainPassword
 * @param {string} storedHash
 * @returns {Promise<boolean>}
 */
function verify(plainPassword, storedHash) {
  return bcrypt.compare(plainPassword, storedHash);
}

module.exports = { hash, verify, MAX_PASSWORD_BYTES };
