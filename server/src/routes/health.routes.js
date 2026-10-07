import { Router } from 'express';
import { isDatabaseReady } from '../config/database.js';

const router = Router();

/**
 * GET /health — Liveness probe.
 * Lightweight — no database queries.
 * Returns 200 if the process is running.
 */
router.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
  });
});

/**
 * GET /ready — Readiness probe.
 * Checks that required dependencies are available.
 * Returns 503 if MongoDB is not connected.
 */
router.get('/ready', (_req, res) => {
  const dbReady = isDatabaseReady();

  const status = {
    database: dbReady ? 'ok' : 'unavailable',
    timestamp: new Date().toISOString(),
  };

  if (!dbReady) {
    return res.status(503).json({ status: 'not ready', ...status });
  }

  return res.status(200).json({ status: 'ready', ...status });
});

export default router;
