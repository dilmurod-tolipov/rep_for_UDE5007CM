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
| Authentication and authorisation | registration done, login next |
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

Requirements: Node.js 20 or newer and a PostgreSQL 14+ database. Either a local
instance or a free managed one (Neon, Render, Supabase) works; put its connection
string in `DATABASE_URL` and set `PGSSL=true` for a managed instance.

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

The application targets PostgreSQL 14 or newer and is developed against a managed
[Neon](https://neon.tech) PostgreSQL 18 instance in the `eu-central-1` region. The
connection is made over TLS with the server certificate verified, which is why
`PGSSL=true` and `sslmode=require` appear in the environment for any hosted database.

Five related tables. All access goes through parameterised SQL
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
npm run db:migrate      # apply db/schema.sql (idempotent, safe to re-run)
npm run db:seed         # load db/seed.sql sample categories and books
npm run db:seed:users   # create the demo librarian and member accounts
npm run db:setup        # migrate, then seed both
npm run db:reset        # DROP every table, then re-apply the schema (development only)
```

## Accounts and security

Passwords are hashed with **bcrypt** at cost factor 12 and never stored or logged in
plain text. bcrypt is used instead of a plain digest such as SHA-256 because it is
deliberately slow and individually salted, so identical passwords produce different
hashes and pre-computed tables are useless. The cost factor is stored inside each
hash, so it can be raised later without invalidating existing accounts.

Self-registration always creates a `member`. The `role` column is set by the server
and is never read from the request body, so a client cannot grant itself librarian
rights by adding a field to the JSON it posts.

Every input is validated server-side with `express-validator` before a handler runs.
Browser-side validation is added later for responsiveness, but it is treated as a
convenience only: anything can post directly to the API, so the server repeats every
check.

Demo accounts created by `npm run db:seed:users` (development only; override with
`SEED_LIBRARIAN_PASSWORD` and `SEED_MEMBER_PASSWORD` on a publicly reachable database):

| Email | Password | Role |
| --- | --- | --- |
| `librarian@library.test` | `Librarian#2026` | librarian |
| `member@library.test` | `Member#2026` | member |

## API

Errors share one shape, so the frontend can handle them uniformly:

```json
{ "error": { "message": "...", "code": "VALIDATION_FAILED", "details": [ { "field": "email", "message": "..." } ] } }
```

### `POST /api/auth/register`

Creates a member account.

```http
POST /api/auth/register
Content-Type: application/json

{ "fullName": "Dilmurod Tolipov", "email": "d.tolipov@example.com", "password": "Str0ngPass!" }
```

| Status | Meaning |
| --- | --- |
| `201 Created` | account created; the new user is returned without any password field |
| `409 Conflict` | the email address is already registered (matched case-insensitively) |
| `422 Unprocessable Content` | one or more fields failed validation; `details` names each field |
| `400 Bad Request` | the request body was not valid JSON |

Password rules: at least 8 characters, at most 72 bytes (bcrypt's limit), containing
at least one letter and one digit.

## Environment variables

All configuration is supplied through environment variables; no secret is committed
to version control. See [`.env.example`](.env.example) for the full list.

| Variable | Purpose |
| --- | --- |
| `NODE_ENV` | `development` or `production` |
| `PORT` | Port the HTTP server binds to |
| `DATABASE_URL` | PostgreSQL connection string |
| `PGSSL` | `true` when the database requires TLS (managed hosting) |
| `PGSSL_NO_VERIFY` | `true` only for a provider with a self-signed certificate |
| `PGPOOL_MAX` | Maximum pooled PostgreSQL connections (default 10) |
| `BCRYPT_ROUNDS` | bcrypt cost factor (default 12) |
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
  routes/          Express routers, mapping URLs to controllers
  controllers/     request handling and response shaping
  services/        reusable logic such as password hashing
  repositories/    all SQL, one module per table group
  validators/      express-validator rule sets per endpoint
  middleware/      validation, async wrapper, error handling
  utils/           AppError and small shared helpers
db/
  schema.sql       tables, constraints, indexes and triggers
  seed.sql         sample catalogue data for development
  drop.sql         teardown used by npm run db:reset
scripts/
  migrate.js       applies the schema
  seed.js          loads the sample catalogue
  seed-users.js    creates the demo accounts with hashed passwords
public/            static frontend assets served by Express
```

## Licence

Submitted as academic coursework. Not licensed for reuse.
