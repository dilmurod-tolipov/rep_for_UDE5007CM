'use strict';

const express = require('express');

const db = require('../db');

const router = express.Router();

/**
 * GET /api/health
 * Liveness and readiness probe. Reports the process uptime and confirms that a
 * query can be executed against PostgreSQL, so a healthy 200 means the whole
 * request path is working. Returns 503 when the database cannot be reached.
 */
router.get('/health', async (req, res) => {
  const base = {
    status: 'ok',
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  };

  try {
    await db.healthCheck();
    res.status(200).json({ ...base, database: 'connected' });
  } catch (error) {
    console.error(`[health] database unreachable: ${db.describeError(error)}`);
    res.status(503).json({ ...base, status: 'degraded', database: 'unreachable' });
  }
});

module.exports = router;
