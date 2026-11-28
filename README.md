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
| Authentication and authorisation | in place |
| REST API (books, categories, loans) | planned |
| Responsive Bootstrap frontend | planned |
| Security headers, CORS and rate limiting | in place |
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

### Server-level protections

| Measure | Implementation | What it stops |
| --- | --- | --- |
| Security headers | `helmet` with an application-specific CSP | `default-src 'self'` with Bootstrap on jsDelivr and covers on Open Library explicitly listed, so an injected script pointing anywhere else is refused by the browser. Also `nosniff`, `X-Frame-Options: SAMEORIGIN`, `frame-ancestors 'none'`, `object-src 'none'`, `Referrer-Policy: same-origin` |
| HSTS | `Strict-Transport-Security`, two years, production only | Downgrade to plain HTTP after the first visit. Not sent in development, where there is no TLS |
| CORS | explicit origin allow-list, `credentials: true` | Any site making authenticated cross-origin calls. `credentials: true` is incompatible with `*`, which is the point: the origin is echoed only when it is on the list, otherwise the request is refused with 403 |
| Rate limiting | `express-rate-limit`, two tiers per IP | Brute-force password guessing (10 failed sign-ins per 15 minutes) and general flooding (300 requests per 15 minutes). Successful sign-ins are not counted, and the limiter runs *before* body parsing so a rejected request never costs a bcrypt hash |
| Body size limit | `express.json({ limit: '100kb' })` | Memory exhaustion from a huge payload; oversized bodies answer `413` |
| Framework disclosure | `x-powered-by` disabled | Free reconnaissance about the stack |
| SQL injection | bound parameters everywhere (see Database) | Injection through any user-supplied value |
| Password storage | bcrypt, cost 12 | Useful plaintext recovery from a stolen database |

Known trade-off: the sign-in limiter keys on IP address, so several people behind
one shared address share a failure budget and could be locked out for the window by
someone else's wrong passwords. The alternative, keying on the submitted email,
lets an attacker sidestep the limit by rotating addresses. For a library system the
IP-based limit is the safer default; a production deployment would combine both and
add a per-account lockout with an email notification.

### Sessions over a stateless protocol

HTTP carries nothing that links two requests from the same person, so the identity
has to travel with every request. This application uses a **signed JSON Web Token**
(HS256) rather than server-side sessions, which keeps the API free of shared session
storage and able to run on more than one instance.

The token is *signed, not encrypted*: anyone holding it can read the payload, so it
carries only the user id, the role and the standard timing claims. Integrity is the
guarantee — altering a single byte invalidates the signature. The permitted algorithm
is pinned on verification, which defeats the `"alg": "none"` substitution attack, and
the issuer and audience are checked so a token minted for something else is refused.

Two transports are accepted for the same token:

| Transport | Used by | Why |
| --- | --- | --- |
| `lms_token` cookie — `HttpOnly; SameSite=Lax; Secure` in production | the browser frontend | JavaScript cannot read an httpOnly cookie, so an injected script cannot steal the token, unlike `localStorage`. `SameSite=Lax` stops it riding along with cross-site form posts, which blocks CSRF on state-changing requests |
| `Authorization: Bearer <token>` | Postman and other API clients | what the protocol section of the report demonstrates, and what a non-browser client needs |

Because a JWT cannot be revoked without reintroducing server-side state, two things
limit the damage from a leaked token: the lifetime is short (`JWT_EXPIRES_IN`, two
hours by default), and the user record is re-read from the database on every request,
so deactivating an account or changing a role takes effect immediately rather than
whenever the token happens to expire. Signing out therefore means discarding the
credential: the cookie is cleared and a bearer client stops sending it.

Login answers a wrong password and an unregistered email with the identical message
and comparable timing — a bcrypt comparison is performed against a dummy hash when no
account matches — so the endpoint cannot be used to discover which addresses are
registered.

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

Errors share one shape, so the frontend can handle them uniformly, and every
failure mode has its own status rather than collapsing into a generic 500:

| Status | When |
| --- | --- |
| `400` | malformed JSON, aborted request |
| `401` / `403` | not signed in / signed in without permission |
| `404` | unknown API route or missing record |
| `413` | request body over 100 kB |
| `415` | unsupported content encoding |
| `422` | validation failure, with a per-field `details` array |
| `429` | rate limit exceeded |
| `500` | unexpected fault; details are logged server-side only |


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

### `POST /api/auth/login`

```http
POST /api/auth/login
Content-Type: application/json

{ "email": "member@library.test", "password": "Member#2026" }
```

Returns `200` with `{ user, token, expiresAt }` and sets the `lms_token` cookie:

```http
HTTP/1.1 200 OK
Set-Cookie: lms_token=eyJhbGciOi...; Max-Age=7200; Path=/; HttpOnly; SameSite=Lax
```

| Status | Meaning |
| --- | --- |
| `200 OK` | signed in; the token is returned in the body and set as a cookie |
| `401 Unauthorized` | wrong credentials or a disabled account, with one generic message |
| `422 Unprocessable Content` | the email or password field was missing or malformed |

### `POST /api/auth/logout`

Clears the cookie. Always `200`, so the frontend can call it without checking first.

### `GET /api/auth/me`

Returns the signed-in user, for restoring session state on page load. Requires a token.

| Status | Meaning |
| --- | --- |
| `200 OK` | `{ user }` |
| `401 Unauthorized` | no token, an invalid or expired token, or a deactivated account |

### Authorisation

`requireAuth` rejects a request without a valid token; `requireRole('librarian')`
rejects a signed-in user whose role is not permitted. The two failures are kept
distinct on purpose — `401` tells the frontend to send the visitor to the login page,
`403` tells it to show a "not allowed" message to someone already signed in.

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
| `JWT_EXPIRES_IN` | Token lifetime, e.g. `2h` (default `2h`) |
| `CORS_ORIGINS` | Comma separated list of allowed browser origins |
| `RATE_LIMIT_WINDOW_MINUTES` | Rate limit window (default 15) |
| `RATE_LIMIT_API_MAX` | Requests per window per IP across the API (default 300) |
| `RATE_LIMIT_AUTH_MAX` | Failed sign-in attempts per window per IP (default 10) |

## Project layout

```
src/
  server.js        process start-up and graceful shutdown
  app.js           Express application, middleware pipeline, route mounting
  config/env.js    environment variable loading, validation and defaults
  db/index.js      PostgreSQL pool, parameterised query and transaction helpers
  routes/          Express routers, mapping URLs to controllers
  controllers/     request handling and response shaping
  services/        reusable logic: password hashing, token issuing
  middleware/      authentication, authorisation, validation, error handling
  repositories/    all SQL, one module per table group
  validators/      express-validator rule sets per endpoint
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
