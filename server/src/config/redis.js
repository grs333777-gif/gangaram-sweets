import Redis from 'ioredis';
import config from './env.js';
import logger from './logger.js';

let redisClient = null;
let isRedisAvailable = false;

export function createRedisClient() {
  if (!config.REDIS_URL) {
    logger.info('Redis URL not configured — caching and distributed rate limiting disabled');
    return null;
  }

  const client = new Redis(config.REDIS_URL, {
    keyPrefix: config.REDIS_KEY_PREFIX,
    maxRetriesPerRequest: 1,
    enableReadyCheck: true,
    lazyConnect: true,
    retryStrategy: (times) => {
      if (times > 3) return null; // stop retrying
      return Math.min(times * 200, 2000);
    },
  });

  client.on('connect', () => {
    isRedisAvailable = true;
    logger.info('Redis connected');
  });

  client.on('ready', () => {
    isRedisAvailable = true;
  });

  client.on('error', (err) => {
    if (isRedisAvailable) {
      logger.warn({ err: err.message }, 'Redis error — falling back to in-memory');
    }
    isRedisAvailable = false;
  });

  client.on('close', () => {
    isRedisAvailable = false;
  });

  return client;
}

export function getRedisClient() {
  return redisClient;
}

export function isRedisReady() {
  return isRedisAvailable && redisClient !== null;
}

export async function connectRedis() {
  if (!config.REDIS_URL) return;
  redisClient = createRedisClient();
  try {
    await redisClient.connect();
  } catch (err) {
    logger.warn({ err: err.message }, 'Redis connection failed — continuing without Redis');
    isRedisAvailable = false;
  }
}

export async function disconnectRedis() {
  if (redisClient) {
    try {
      await redisClient.quit();
      logger.info('Redis disconnected');
    } catch (err) {
      logger.warn({ err: err.message }, 'Error disconnecting Redis');
    }
  }
}
