#!/usr/bin/env node
'use strict';

/**
 * Creates the two demonstration accounts used during development and for the
 * project demonstration:
 *
 *   librarian@library.test  - full catalogue and loan management rights
 *   member@library.test     - an ordinary borrower
 *
 * Passwords are hashed with bcrypt here rather than being written into
 * db/seed.sql, so no password or hand-made hash is ever committed. Override the
 * defaults with SEED_LIBRARIAN_PASSWORD / SEED_MEMBER_PASSWORD when seeding a
 * database that is reachable from the internet.
 *
 *   npm run db:seed:users
 */

const db = require('../src/db');
const passwordService = require('../src/services/password-service');

const ACCOUNTS = [
  {
    fullName: 'Layla Karimova',
    email: 'librarian@library.test',
    role: 'librarian',
    password: process.env.SEED_LIBRARIAN_PASSWORD || 'Librarian#2026',
  },
  {
    fullName: 'Demo Member',
    email: 'member@library.test',
    role: 'member',
    password: process.env.SEED_MEMBER_PASSWORD || 'Member#2026',
  },
];

async function main() {
  for (const account of ACCOUNTS) {
    const passwordHash = await passwordService.hash(account.password);

    // Re-runnable: an existing account has its password and role reset rather
    // than causing a unique-violation.
    const row = await db.queryOne(
      `INSERT INTO users (full_name, email, password_hash, role)
            VALUES ($1, $2, $3, $4)
       ON CONFLICT (lower(email))
       DO UPDATE SET full_name = EXCLUDED.full_name,
                     password_hash = EXCLUDED.password_hash,
                     role = EXCLUDED.role
         RETURNING id, email, role`,
      [account.fullName, account.email, passwordHash, account.role],
    );

    console.log(`[seed:users] ${row.email} (${row.role}), id ${row.id}`);
  }
}

main()
  .catch((error) => {
    console.error(`[seed:users] failed: ${db.describeError(error)}`);
    process.exitCode = 1;
  })
  .finally(() => db.close());
