'use strict';

const rateLimit = require('express-rate-limit');

const config = require('../config/env');

/**
 * Rate limiting.
 *
 * Two tiers, both keyed on the client IP. The general limiter protects the API
 * from being hammered; the much tighter auth limiter makes online password
 * guessing impractical. bcrypt already makes each attempt expensive, but
 * without a limit an attacker can still run attempts in parallel for as long
 * as they like.
 *
 * The limit is expressed in the API's own error shape so the frontend can show
 * it like any other failure, and the standard RateLimit-* headers are sent so
 * a client can see its remaining budget.
 */

const windowMs = config.rateLimitWindowMinutes * 60 * 1000;

function limitHandler(message) {
  return (req, res) => {
    res.status(429).json({ error: { message, code: 'RATE_LIMITED' } });
  };
}

const apiLimiter = rateLimit({
  windowMs,
  limit: config.rateLimitApiMax,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: limitHandler('Too many requests. Please slow down and try again shortly.'),
});

const authLimiter = rateLimit({
  windowMs,
  limit: config.rateLimitAuthMax,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  // A successful sign-in does not count towards the limit, so a legitimate
  // user who simply logs in often is never locked out; only failures count.
  skipSuccessfulRequests: true,
  handler: limitHandler(
    'Too many sign-in attempts from this address. Please wait a few minutes and try again.',
  ),
});

module.exports = { apiLimiter, authLimiter };
