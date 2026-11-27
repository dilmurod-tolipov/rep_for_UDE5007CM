'use strict';

/**
 * Converts a short duration string such as '2h', '45m', '30s' or '7d' into
 * milliseconds. A plain number is treated as seconds, matching how
 * jsonwebtoken interprets expiresIn, so the cookie lifetime and the token
 * lifetime cannot drift apart.
 *
 * @param {string|number} value
 * @returns {number} milliseconds
 */
function ms(value) {
  if (typeof value === 'number') return value * 1000;

  const match = /^(\d+(?:\.\d+)?)\s*(ms|s|m|h|d)?$/.exec(String(value).trim());

  if (!match) {
    throw new Error(`Unsupported duration: ${value}`);
  }

  const amount = Number.parseFloat(match[1]);
  const unit = match[2] || 's';

  const multipliers = { ms: 1, s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };

  return amount * multipliers[unit];
}

module.exports = ms;
