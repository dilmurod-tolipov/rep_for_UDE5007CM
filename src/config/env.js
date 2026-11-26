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
};

module.exports = config;
