'use strict';

const config = require('./config/env');
const app = require('./app');

const server = app.listen(config.port, () => {
  console.log(`[server] listening on port ${config.port} (${config.nodeEnv})`);
});

// Allow the platform to stop the process cleanly on redeploy.
for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => {
    console.log(`[server] ${signal} received, shutting down`);
    server.close(() => process.exit(0));
  });
}
