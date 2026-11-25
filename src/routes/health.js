'use strict';

const express = require('express');

const router = express.Router();

/**
 * GET /api/health
 * Lightweight liveness probe. Used by the hosting platform to confirm the
 * process is up, and during development to confirm the server is reachable.
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
