-- =============================================================================
-- Library Management System - relational schema
-- PostgreSQL 14+
--
-- Applied by `npm run db:migrate`. Every statement is idempotent so the script
-- can be re-run safely, including automatically on deployment.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Shared trigger function: keeps updated_at accurate without the application
-- having to remember to set it.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------------------------------
-- users - library members and librarians
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  full_name     VARCHAR(120)  NOT NULL CHECK (length(btrim(full_name)) >= 2),
  email         VARCHAR(255)  NOT NULL,
  password_hash VARCHAR(255)  NOT NULL,
  role          VARCHAR(20)   NOT NULL DEFAULT 'member'
                              CHECK (role IN ('member', 'librarian')),
  is_active     BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- Email uniqueness is case-insensitive: Alice@x.com and alice@x.com are one account.
CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_key ON users (lower(email));

DROP TRIGGER IF EXISTS users_set_updated_at ON users;
CREATE TRIGGER users_set_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- -----------------------------------------------------------------------------
-- categories - how the catalogue is organised
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(80) NOT NULL UNIQUE CHECK (length(btrim(name)) >= 2),
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- books - catalogue items, with copy counts for availability
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS books (
  id               SERIAL PRIMARY KEY,
  title            VARCHAR(200) NOT NULL CHECK (length(btrim(title)) >= 1),
  author           VARCHAR(160) NOT NULL CHECK (length(btrim(author)) >= 1),
  isbn             VARCHAR(20)  NOT NULL UNIQUE,
  category_id      INTEGER      NOT NULL REFERENCES categories (id) ON DELETE RESTRICT,
  published_year   SMALLINT     CHECK (published_year BETWEEN 1450 AND 2100),
  total_copies     SMALLINT     NOT NULL DEFAULT 1 CHECK (total_copies >= 0),
  available_copies SMALLINT     NOT NULL DEFAULT 1 CHECK (available_copies >= 0),
  cover_url        TEXT,
  description      TEXT,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
  -- A copy cannot be available unless it exists.
  CONSTRAINT books_available_within_total CHECK (available_copies <= total_copies)
);

CREATE INDEX IF NOT EXISTS books_category_id_idx ON books (category_id);
-- Supports the catalogue's case-insensitive search on title and author.
CREATE INDEX IF NOT EXISTS books_title_lower_idx  ON books (lower(title));
CREATE INDEX IF NOT EXISTS books_author_lower_idx ON books (lower(author));

DROP TRIGGER IF EXISTS books_set_updated_at ON books;
CREATE TRIGGER books_set_updated_at
  BEFORE UPDATE ON books
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- -----------------------------------------------------------------------------
-- loans - the borrowing record linking users to books
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS loans (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER     NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  book_id     INTEGER     NOT NULL REFERENCES books (id) ON DELETE RESTRICT,
  borrowed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  due_at      TIMESTAMPTZ NOT NULL,
  returned_at TIMESTAMPTZ,
  fine_cents  INTEGER     NOT NULL DEFAULT 0 CHECK (fine_cents >= 0),
  CONSTRAINT loans_due_after_borrow   CHECK (due_at > borrowed_at),
  CONSTRAINT loans_return_after_borrow CHECK (returned_at IS NULL OR returned_at >= borrowed_at)
);

CREATE INDEX IF NOT EXISTS loans_user_id_idx ON loans (user_id);
CREATE INDEX IF NOT EXISTS loans_book_id_idx ON loans (book_id);
-- Speeds up "my current loans" and the overdue report.
CREATE INDEX IF NOT EXISTS loans_open_due_idx ON loans (due_at) WHERE returned_at IS NULL;
-- A member may not hold two simultaneous copies of the same title.
CREATE UNIQUE INDEX IF NOT EXISTS loans_one_open_per_user_book
  ON loans (user_id, book_id) WHERE returned_at IS NULL;

-- -----------------------------------------------------------------------------
-- audit_log - append-only trail of privileged actions
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_log (
  id         BIGSERIAL PRIMARY KEY,
  user_id    INTEGER     REFERENCES users (id) ON DELETE SET NULL,
  action     VARCHAR(40) NOT NULL,
  entity     VARCHAR(40) NOT NULL,
  entity_id  INTEGER,
  details    JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_log_created_at_idx ON audit_log (created_at DESC);
