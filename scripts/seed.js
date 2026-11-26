#!/usr/bin/env node
'use strict';

/**
 * Loads development data into an already-migrated database.
 *
 *   npm run db:seed
 *
 * Safe to run repeatedly: the statements in db/seed.sql ignore conflicts on
 * natural keys, so existing rows are left untouched.
 */

const fs = require('node:fs/promises');
const path = require('node:path');

const db = require('../src/db');

async function main() {
  const sql = await fs.readFile(path.join(__dirname, '..', 'db', 'seed.sql'), 'utf8');
  await db.pool.query(sql);

  const counts = await db.queryOne(
    `SELECT (SELECT count(*) FROM categories) AS categories,
            (SELECT count(*) FROM books)      AS books`,
  );
  console.log(`[seed] categories: ${counts.categories}, books: ${counts.books}`);
}

main()
  .catch((error) => {
    console.error(`[seed] failed: ${db.describeError(error)}`);
    process.exitCode = 1;
  })
  .finally(() => db.close());
