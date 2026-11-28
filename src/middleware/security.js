'use strict';

const cors = require('cors');
const helmet = require('helmet');

const config = require('../config/env');
const AppError = require('../utils/app-error');

/**
 * HTTP security headers.
 *
 * The Content-Security-Policy is written for this application specifically
 * rather than left at helmet's default, because the frontend loads Bootstrap's
 * CSS and JavaScript from jsDelivr and book cover images from Open Library. A
 * policy that lists exactly those sources means an injected <script> pointing
 * anywhere else is refused by the browser, which is a second line of defence
 * behind output escaping.
 */
const securityHeaders = helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", 'https://cdn.jsdelivr.net'],
      styleSrc: ["'self'", 'https://cdn.jsdelivr.net'],
      fontSrc: ["'self'", 'https://cdn.jsdelivr.net', 'data:'],
      imgSrc: ["'self'", 'data:', 'https://covers.openlibrary.org'],
      connectSrc: ["'self'"],
      mediaSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
      formAction: ["'self'"],
      baseUri: ["'self'"],
      upgradeInsecureRequests: config.isProduction ? [] : null,
    },
  },
  // Cover images are loaded from another origin, so the strictest
  // cross-origin resource policy would block them.
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  // Tell browsers to use HTTPS for the next two years. Only sent in
  // production, where TLS is actually terminated by the platform.
  strictTransportSecurity: config.isProduction
    ? { maxAge: 63_072_000, includeSubDomains: true, preload: false }
    : false,
  referrerPolicy: { policy: 'same-origin' },
});

/**
 * Cross-Origin Resource Sharing.
 *
 * The frontend is served by this same process, so the browser treats its calls
 * as same-origin and CORS never applies to them. The allow-list exists for a
 * frontend served from somewhere else during development, and for the API
 * client used in the protocol demonstration.
 *
 * `credentials: true` is what permits the authentication cookie to be sent on
 * a cross-origin request, and it is precisely why the origin cannot be '*':
 * the browser refuses that combination, and a wildcard would let any site make
 * authenticated requests on a signed-in user's behalf.
 */
const crossOrigin = cors({
  origin(origin, callback) {
    // No Origin header: a same-origin navigation, curl, or Postman.
    if (!origin) {
      callback(null, true);
      return;
    }

    if (config.corsOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(AppError.forbidden(`Origin ${origin} is not allowed to call this API.`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['RateLimit', 'RateLimit-Policy'],
  maxAge: 600,
});

module.exports = { securityHeaders, crossOrigin };
