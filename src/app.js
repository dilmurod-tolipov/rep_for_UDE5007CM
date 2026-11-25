'use strict';

const path = require('node:path');
const express = require('express');

const healthRouter = require('./routes/health');

const app = express();

// Render and similar platforms terminate TLS at a reverse proxy, so the real
// client protocol and IP arrive in X-Forwarded-* headers.
app.set('trust proxy', 1);

// Body parsers. The size limit is deliberately small: this API only ever
// receives small JSON documents.
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: false, limit: '100kb' }));

// Static frontend.
app.use(express.static(path.join(__dirname, '..', 'public')));

// REST API.
app.use('/api', healthRouter);

module.exports = app;
