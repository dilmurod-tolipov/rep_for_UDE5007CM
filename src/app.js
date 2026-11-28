'use strict';

const path = require('node:path');
const cookieParser = require('cookie-parser');
const express = require('express');

const { notFoundHandler, errorHandler } = require('./middleware/error-handler');
const { apiLimiter, authLimiter } = require('./middleware/rate-limit');
const { securityHeaders, crossOrigin } = require('./middleware/security');
const authRouter = require('./routes/auth');
const healthRouter = require('./routes/health');

const app = express();

// Render and similar platforms terminate TLS at a reverse proxy, so the real
// client protocol and IP arrive in X-Forwarded-* headers. Rate limiting keys on
// that address, so without this every request would appear to come from the
// proxy and share one budget.
app.set('trust proxy', 1);

// Do not advertise the framework in every response.
app.disable('x-powered-by');

// Security headers on everything, including the static frontend, so the
// Content-Security-Policy reaches the pages that need it.
app.use(securityHeaders);

// CORS applies to the API only; the frontend is served from this same origin.
app.use('/api', crossOrigin);

// Rate limiting sits before body parsing, so a request over the limit is
// rejected without its body being read or a password hashed. The tighter
// limiter is registered first and only for the credential endpoints.
app.use(['/api/auth/login', '/api/auth/register'], authLimiter);
app.use('/api', apiLimiter);

// Body parsers. The size limit is deliberately small: this API only ever
// receives small JSON documents, and an unbounded body is a denial-of-service
// vector.
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: false, limit: '100kb' }));

// Reads the httpOnly authentication cookie into req.cookies.
app.use(cookieParser());

// Static frontend.
app.use(express.static(path.join(__dirname, '..', 'public')));

// REST API.
app.use('/api', healthRouter);
app.use('/api', authRouter);

// Unmatched API route, then the single error-to-response boundary. Both must be
// registered after every route.
app.use('/api', notFoundHandler);
app.use(errorHandler);

module.exports = app;
