import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),

  // MongoDB
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  MONGODB_POOL_SIZE: z.coerce.number().int().positive().default(10),
  MONGODB_SERVER_SELECTION_TIMEOUT_MS: z.coerce.number().int().positive().default(5000),

  // JWT
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  JWT_ISSUER: z.string().default('gangaram-sweets-api'),
  JWT_AUDIENCE: z.string().default('gangaram-sweets-client'),

  // Cookies
  COOKIE_DOMAIN: z.string().optional(),
  COOKIE_SECURE: z
    .string()
    .transform((v) => v === 'true')
    .default('false'),
  COOKIE_SAMESITE: z.enum(['strict', 'lax', 'none']).default('lax'),

  // Redis (optional)
  REDIS_URL: z.string().optional(),
  REDIS_KEY_PREFIX: z.string().default('gs:'),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(200),
  AUTH_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900000),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(15),
  CHECKOUT_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60000),
  CHECKOUT_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(5),

  // Delivery
  DELIVERY_FEE_PAISE: z.coerce.number().int().nonnegative().default(4000),
  FREE_DELIVERY_ABOVE_PAISE: z.coerce.number().int().nonnegative().default(50000),
  MIN_ORDER_AMOUNT_PAISE: z.coerce.number().int().nonnegative().default(20000),

  // Tax
  GST_RATE_PERCENT: z.coerce.number().nonnegative().default(0),

  // Serviceability
  SERVICEABLE_PINCODES: z
    .string()
    .default('')
    .transform((v) => (v ? v.split(',').map((p) => p.trim()) : [])),

  // Logging
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  LOG_PRETTY: z
    .string()
    .transform((v) => v === 'true')
    .default('false'),

  // Password Reset
  PASSWORD_RESET_EXPIRES_MINUTES: z.coerce.number().int().positive().default(30),

  // Account Lockout
  MAX_FAILED_LOGIN_ATTEMPTS: z.coerce.number().int().positive().default(5),
  ACCOUNT_LOCK_DURATION_MINUTES: z.coerce.number().int().positive().default(30),

  // Cart
  MAX_CART_ITEM_QUANTITY: z.coerce.number().int().positive().default(20),
  MAX_CART_ITEMS: z.coerce.number().int().positive().default(50),

  // Request Body
  REQUEST_BODY_LIMIT: z.string().default('100kb'),
});

let config;

try {
  // In test env, load from process.env directly (set by test setup)
  // In dev/prod, we load .env manually before this runs
  config = envSchema.parse(process.env);
} catch (error) {
  if (error instanceof z.ZodError) {
    const missing = error.errors.map((e) => `  ${e.path.join('.')}: ${e.message}`).join('\n');
    // eslint-disable-next-line no-console
    console.error(`\n❌ Environment validation failed:\n${missing}\n`);
    process.exit(1);
  }
  throw error;
}

export default Object.freeze(config);
