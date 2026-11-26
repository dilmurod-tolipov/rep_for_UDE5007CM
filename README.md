# Library Management System

Full-stack web application for managing a small library: a book catalogue, member
accounts, borrowing and returning of books, overdue fines and a librarian dashboard.

Coursework artefact for **UDE5007CM Web Development** (Coventry University Group).

## Status

Early development. The repository is built up incrementally; see the commit history
for how the system evolved.

| Area | State |
| --- | --- |
| Express server and project structure | in place |
| PostgreSQL schema and data access | in place |
| Authentication and authorisation | planned |
| REST API (books, categories, loans) | planned |
| Responsive Bootstrap frontend | planned |
| Automated tests | planned |
| Cloud deployment | planned |

## Technology

- **Backend:** Node.js with Express, REST API
- **Database:** PostgreSQL (parameterised SQL via `pg`)
- **Frontend:** HTML, Bootstrap 5, vanilla JavaScript
- **Hosting:** Render (web service + managed PostgreSQL)

## Running locally

Requirements: Node.js 20 or newer, and (from the next development step onwards)
a local PostgreSQL 14+ instance.

```bash
git clone https://github.com/dilmurod-tolipov/rep_for_UDE5007CM.git
cd rep_for_UDE5007CM
npm install
cp .env.example .env    # then edit the values
npm run db:setup        # create the tables and load sample data
npm run dev
```

The server starts on <http://localhost:3000>. A health check is available at
<http://localhost:3000/api/health>; it returns `200` with `"database": "connected"`
only when PostgreSQL can be queried, and `503` otherwise.

## Database

PostgreSQL with five related tables. All access goes through parameterised SQL
(`$1`, `$2`, ...) in [`src/db/index.js`](src/db/index.js), so values are bound by the
driver and never interpolated into a statement.

| Table | Purpose | Key relationships |
| --- | --- | --- |
| `users` | Members and librarians | referenced by `loans`, `audit_log` |
| `categories` | Catalogue sections | referenced by `books` |
| `books` | Catalogue items with copy counts | `category_id` → `categories` |
| `loans` | Borrow/return records and fines | `user_id` → `users`, `book_id` → `books` |
| `audit_log` | Trail of privileged actions | `user_id` → `users` |

Integrity is enforced in the schema rather than only in application code: a book's
`available_copies` can never exceed `total_copies`, a loan's due date must follow its
borrow date, and a partial unique index stops one member holding two copies of the
same title at once.

Database commands:

```bash
npm run db:migrate   # apply db/schema.sql (idempotent, safe to re-run)
npm run db:seed      # load db/seed.sql sample categories and books
npm run db:setup     # migrate, then seed
npm run db:reset     # DROP every table, then re-apply the schema (development only)
```

## Environment variables

All configuration is supplied through environment variables; no secret is committed
to version control. See [`.env.example`](.env.example) for the full list.

| Variable | Purpose |
| --- | --- |
| `NODE_ENV` | `development` or `production` |
| `PORT` | Port the HTTP server binds to |
| `DATABASE_URL` | PostgreSQL connection string |
| `PGSSL` | `true` when the database requires TLS (managed hosting) |
| `PGPOOL_MAX` | Maximum pooled PostgreSQL connections (default 10) |
| `JWT_SECRET` | Signing key for authentication tokens |
| `JWT_EXPIRES_IN` | Token lifetime, e.g. `2h` |
| `CORS_ORIGINS` | Comma separated list of allowed browser origins |

## Project layout

```
src/
  server.js        process start-up and graceful shutdown
  app.js           Express application, middleware pipeline, route mounting
  config/env.js    environment variable loading, validation and defaults
  db/index.js      PostgreSQL pool, parameterised query and transaction helpers
  routes/          REST API route modules
db/
  schema.sql       tables, constraints, indexes and triggers
  seed.sql         sample catalogue data for development
  drop.sql         teardown used by npm run db:reset
scripts/
  migrate.js       applies the schema
  seed.js          loads the sample data
public/            static frontend assets served by Express
```

## Licence

Submitted as academic coursework. Not licensed for reuse.
