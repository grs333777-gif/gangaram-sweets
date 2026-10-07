import './loadEnv.js';
import config from './config/env.js';
import logger from './config/logger.js';
import app from './app.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { seedCatalogIfEmpty } from './services/catalog.service.js';
import { seedAdminIfMissing } from './services/admin.seed.js';
import { startPaymentWorkers } from './payments/razorpay.js';

const PORT = config.PORT;
let server;

// ─── Graceful Shutdown ───
async function shutdown(signal) {
  logger.info({ signal }, 'Shutdown signal received — shutting down gracefully');

  // Stop accepting new connections
  server.close(async () => {
    logger.info('HTTP server closed — no longer accepting connections');

    try {
      await disconnectDatabase();
      logger.info('All connections closed — exiting cleanly');
      process.exit(0);
    } catch (err) {
      logger.error({ err }, 'Error during shutdown');
      process.exit(1);
    }
  });

  // Force shutdown after timeout if graceful fails
  setTimeout(() => {
    logger.error('Graceful shutdown timed out — forcing exit');
    process.exit(1);
  }, 15000).unref();
}

// ─── Safety nets ───
process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'Unhandled Promise Rejection');
  // In production, exit so the process manager (PM2/systemd) can restart
  if (config.NODE_ENV === 'production') {
    shutdown('unhandledRejection');
  }
});

process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'Uncaught Exception — shutting down');
  shutdown('uncaughtException');
});

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// ─── Startup ───
async function start() {
  try {
    logger.info({ env: config.NODE_ENV, port: PORT }, 'Starting Gangaram Sweets API');

    await connectDatabase();
    await seedCatalogIfEmpty();
    await seedAdminIfMissing();
    await startPaymentWorkers();

    server = app.listen(PORT, () => {
      logger.info({ port: PORT }, `🚀 Server listening on port ${PORT}`);
    });

    // Set keep-alive and headers timeout for production
    server.keepAliveTimeout = 65000;
    server.headersTimeout = 66000;
  } catch (err) {
    logger.fatal({ err }, 'Failed to start server');
    process.exit(1);
  }
}

start();
