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
| PostgreSQL schema and data access | planned |
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
npm run dev
```

The server starts on <http://localhost:3000>. A liveness check is available at
<http://localhost:3000/api/health>.

## Environment variables

All configuration is supplied through environment variables; no secret is committed
to version control. See [`.env.example`](.env.example) for the full list.

| Variable | Purpose |
| --- | --- |
| `NODE_ENV` | `development` or `production` |
| `PORT` | Port the HTTP server binds to |
| `DATABASE_URL` | PostgreSQL connection string |
| `PGSSL` | `true` when the database requires TLS (managed hosting) |
| `JWT_SECRET` | Signing key for authentication tokens |
| `JWT_EXPIRES_IN` | Token lifetime, e.g. `2h` |
| `CORS_ORIGINS` | Comma separated list of allowed browser origins |

## Project layout

```
src/
  server.js        process start-up and graceful shutdown
  app.js           Express application, middleware pipeline, route mounting
  config/env.js    environment variable loading and defaults
  routes/          REST API route modules
public/            static frontend assets served by Express
```

## Licence

Submitted as academic coursework. Not licensed for reuse.
