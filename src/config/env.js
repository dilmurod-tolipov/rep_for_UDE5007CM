'use strict';

const path = require('node:path');
const dotenv = require('dotenv');

// Load variables from .env when present. In production (Render) the variables are
// injected by the platform, so a missing .env file is not an error.
dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') });

const nodeEnv = process.env.NODE_ENV || 'development';

const config = {
  nodeEnv,
  isProduction: nodeEnv === 'production',
  port: Number.parseInt(process.env.PORT, 10) || 3000,
};

module.exports = config;
