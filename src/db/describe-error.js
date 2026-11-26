'use strict';

/**
 * Produces a readable one-line description of a database error.
 *
 * Connection failures from `pg` surface as an AggregateError (one failure per
 * resolved address) whose own `message` is empty, which makes a plain
 * `error.message` useless in logs. This unwraps the common cases and adds the
 * driver/system error code when there is one.
 *
 * @param {unknown} error
 * @returns {string}
 */
function describeError(error) {
  if (!error || typeof error !== 'object') return String(error);

  const parts = [];

  if (error.message) parts.push(error.message);

  if (Array.isArray(error.errors) && error.errors.length > 0) {
    const inner = error.errors
      .map((e) => [e.code, e.message].filter(Boolean).join(' '))
      .filter(Boolean);
    if (inner.length > 0) parts.push(inner.join('; '));
  }

  if (error.code && !parts.some((part) => part.includes(error.code))) {
    parts.push(`code ${error.code}`);
  }

  // PostgreSQL server-side errors carry extra context worth seeing.
  for (const field of ['detail', 'hint', 'constraint']) {
    if (error[field]) parts.push(`${field}: ${error[field]}`);
  }

  return parts.length > 0 ? parts.join(' | ') : 'unknown database error';
}

module.exports = describeError;
