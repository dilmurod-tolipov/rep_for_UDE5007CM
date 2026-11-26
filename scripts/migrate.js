#!/usr/bin/env node
'use strict';

/**
 * Applies the database schema.
 *
 *   npm run db:migrate            apply db/schema.sql (idempotent)
 *   npm run db:reset              drop everything first, then apply the schema
 *
 * The same script runs locally and on the hosting platform after a deploy.
 */

const fs = require('node:fs/promises');
const path = require('node:path');

const db = require('../src/db');

const DB_DIR = path.join(__dirname, '..', 'db');

async function runFile(name) {
  const sql = await fs.readFile(path.join(DB_DIR, name), 'utf8');
  await db.pool.query(sql);
  console.log(`[migrate] applied ${name}`);
}

async function main() {
  const reset = process.argv.includes('--reset');

  if (reset) {
    console.warn('[migrate] --reset: dropping all tables, data will be lost');
    await runFile('drop.sql');
  }

  await runFile('schema.sql');

  const { rows } = await db.query(
    `SELECT table_name
       FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name`,
  );
  console.log(`[migrate] tables present: ${rows.map((r) => r.table_name).join(', ')}`);
}

main()
  .catch((error) => {
    console.error(`[migrate] failed: ${db.describeError(error)}`);
    process.exitCode = 1;
  })
  .finally(() => db.close());
