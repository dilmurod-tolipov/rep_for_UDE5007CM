'use strict';

const { Pool } = require('pg');

const config = require('../config/env');
const describeError = require('./describe-error');

/**
 * A single connection pool is shared by the whole process. Managed PostgreSQL
 * instances cap the number of connections, so the pool is kept small and idle
 * clients are released.
 */
const pool = new Pool({
  connectionString: config.databaseUrl,
  ssl: config.databaseSsl ? { rejectUnauthorized: false } : false,
  max: config.databasePoolMax,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});

// An error on an idle client (for example the database restarting) must not
// take the process down; the pool will replace the client on the next query.
pool.on('error', (error) => {
  console.error(`[db] idle client error: ${describeError(error)}`);
});

/**
 * Runs a single parameterised statement.
 *
 * Every value reaches PostgreSQL as a bound parameter ($1, $2, ...) rather than
 * being interpolated into the SQL string, which is what makes the application
 * immune to SQL injection.
 *
 * @param {string} text SQL with $1-style placeholders
 * @param {Array<unknown>} [params] values bound to the placeholders
 */
async function query(text, params = []) {
  const startedAt = Date.now();
  const result = await pool.query(text, params);

  if (!config.isProduction) {
    const duration = Date.now() - startedAt;
    console.log(`[db] ${duration}ms, ${result.rowCount} row(s): ${collapse(text)}`);
  }

  return result;
}

/**
 * Convenience wrapper returning the first row, or null when nothing matched.
 */
async function queryOne(text, params = []) {
  const { rows } = await query(text, params);
  return rows[0] ?? null;
}

/**
 * Runs `callback` inside a transaction on a dedicated client and commits it.
 * Any thrown error rolls the transaction back and is re-thrown.
 *
 * Used where several statements must succeed or fail together, such as issuing
 * a loan while decrementing the number of available copies.
 *
 * @param {(client: import('pg').PoolClient) => Promise<T>} callback
 * @returns {Promise<T>}
 * @template T
 */
async function withTransaction(callback) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {
      /* the client is already broken; the finally block releases it */
    });
    throw error;
  } finally {
    client.release();
  }
}

/** Confirms the database is reachable. Used by the health endpoint. */
async function healthCheck() {
  const row = await queryOne('SELECT now() AS now');
  return row.now;
}

/** Closes the pool so the process can exit cleanly. */
async function close() {
  await pool.end();
}

function collapse(sql) {
  return sql.replace(/\s+/g, ' ').trim().slice(0, 120);
}

module.exports = {
  pool,
  query,
  queryOne,
  withTransaction,
  healthCheck,
  close,
  describeError,
};
