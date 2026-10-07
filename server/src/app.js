import './loadEnv.js';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import hpp from 'hpp';
import pinoHttp from 'pino-http';
import { v4 as uuidv4 } from 'uuid';

import config from './config/env.js';
import logger from './config/logger.js';
import { globalRateLimit } from './middlewares/rateLimiter.middleware.js';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.middleware.js';

// Routes
import healthRoutes from './routes/health.routes.js';
import authRoutes from './routes/auth.routes.js';
import productRoutes from './routes/product.routes.js';
import cartRoutes from './routes/cart.routes.js';
import orderRoutes from './routes/order.routes.js';
import addressRoutes from './routes/address.routes.js';
import { createPaymentsRouter } from './payments/razorpay.js';

const app = express();

// ─── Trust Proxy (for correct IP behind load balancer) ───
app.set('trust proxy', 1);

// ─── Request ID ───
app.use((req, _res, next) => {
  req.id = req.headers['x-request-id'] || uuidv4();
  next();
});

// ─── HTTP Logging ───
app.use(
  pinoHttp({
    logger,
    genReqId: (req) => req.id,
    customLogLevel: (_req, res) => {
      if (res.statusCode >= 500) return 'error';
      if (res.statusCode >= 400) return 'warn';
      return 'info';
    },
    serializers: {
      req: (req) => ({
        method: req.method,
        url: req.url,
        requestId: req.id,
      }),
      res: (res) => ({
        statusCode: res.statusCode,
      }),
    },
  }),
);

// ─── Security Headers ───
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'same-site' },
    contentSecurityPolicy: config.NODE_ENV === 'production',
  }),
);

// ─── CORS ───
const allowedOrigins = config.CORS_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean);

function isAllowedOrigin(origin) {
  if (!origin || allowedOrigins.includes(origin)) return true;
  if (config.NODE_ENV === 'production') return false;
  try {
    const url = new URL(origin);
    return url.protocol === 'http:' && (url.hostname === 'localhost' || url.hostname === '127.0.0.1');
  } catch {
    return false;
  }
}

app.use(
  cors({
    origin: (origin, callback) => {
      callback(null, isAllowedOrigin(origin));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key', 'X-Request-Id'],
    exposedHeaders: ['X-Request-Id'],
    maxAge: 600,
  }),
);

app.use(cookieParser());

// Payments router must be mounted before express.json() so the Razorpay webhook keeps its raw body.
const paymentsRouter = createPaymentsRouter();
if (paymentsRouter) {
  app.use('/api/payments', paymentsRouter);
}

// ─── Body Parsing ───
app.use(express.json({ limit: config.REQUEST_BODY_LIMIT }));
app.use(express.urlencoded({ extended: false, limit: config.REQUEST_BODY_LIMIT }));

// ─── HTTP Parameter Pollution Protection ───
app.use(hpp());

// ─── Global Rate Limiting ───
app.use(globalRateLimit);

// ─── Health Checks (no auth, no rate limit beyond global) ───
app.use('/', healthRoutes);

// ─── API Routes ───
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/addresses', addressRoutes);

// ─── 404 Handler ───
app.use(notFoundHandler);

// ─── Central Error Handler ───
app.use(errorHandler);

export default app;
