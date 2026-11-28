'use strict';

const path = require('node:path');
const dotenv = require('dotenv');

// Load variables from .env when present. In production (Render) the variables are
// injected by the platform, so a missing .env file is not an error.
dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') });

const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';

function requireEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(
      `Missing required environment variable ${name}. ` +
        'Copy .env.example to .env and fill it in (see README).',
    );
  }

  return value;
}

function boolEnv(name, fallback) {
  const value = process.env[name];
  if (value === undefined || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

// A weak signing key defeats the whole token scheme, so a short one is refused
// outright in production rather than quietly accepted.
function requireSecret(name, minLength) {
  const value = requireEnv(name);

  if (isProduction && value.length < minLength) {
    throw new Error(
      `${name} must be at least ${minLength} characters in production. ` +
        'Generate one with: openssl rand -hex 48',
    );
  }

  return value;
}

const config = {
  nodeEnv,
  isProduction,
  port: Number.parseInt(process.env.PORT, 10) || 3000,

  databaseUrl: requireEnv('DATABASE_URL'),
  // Managed PostgreSQL requires TLS; a local instance normally does not.
  databaseSsl: boolEnv('PGSSL', isProduction),
  // The server certificate is verified against the system CA store by default.
  // Only disable this for a platform that presents a self-signed certificate.
  databaseSslVerify: !boolEnv('PGSSL_NO_VERIFY', false),
  databasePoolMax: Number.parseInt(process.env.PGPOOL_MAX, 10) || 10,

  // Browser origins allowed to call the API with credentials. The frontend is
  // served by this same process, so same-origin requests need no entry here;
  // the list exists for a separately hosted or locally served frontend.
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),

  // Rate limiting windows, in minutes and requests per window per IP.
  rateLimitWindowMinutes: Number.parseInt(process.env.RATE_LIMIT_WINDOW_MINUTES, 10) || 15,
  rateLimitApiMax: Number.parseInt(process.env.RATE_LIMIT_API_MAX, 10) || 300,
  rateLimitAuthMax: Number.parseInt(process.env.RATE_LIMIT_AUTH_MAX, 10) || 10,

  jwtSecret: requireSecret('JWT_SECRET', 32),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '2h',
  jwtIssuer: 'library-management-system',
  jwtAudience: 'library-management-system/api',

  // Name of the httpOnly cookie carrying the token.
  authCookieName: 'lms_token',

  // bcrypt cost factor. 12 means 2^12 key-expansion rounds, roughly a quarter
  // of a second per hash, which is cheap for a login and expensive for anyone
  // attempting an offline brute-force against a stolen database.
  bcryptRounds: Number.parseInt(process.env.BCRYPT_ROUNDS, 10) || 12,
};

module.exports = config;
