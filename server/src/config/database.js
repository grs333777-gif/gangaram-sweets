import mongoose from 'mongoose';
import config from './env.js';
import logger from './logger.js';

const MONGOOSE_OPTIONS = {
  maxPoolSize: config.MONGODB_POOL_SIZE,
  serverSelectionTimeoutMS: config.MONGODB_SERVER_SELECTION_TIMEOUT_MS,
  socketTimeoutMS: 45000,
  family: 4,
};

export async function connectDatabase() {
  try {
    await mongoose.connect(config.MONGODB_URI, MONGOOSE_OPTIONS);
    logger.info({ uri: config.MONGODB_URI.replace(/\/\/[^@]+@/, '//***@') }, 'MongoDB connected');
  } catch (error) {
    logger.fatal({ err: error }, 'MongoDB connection failed');
    throw error;
  }
}

export async function disconnectDatabase() {
  try {
    await mongoose.disconnect();
    logger.info('MongoDB disconnected');
  } catch (error) {
    logger.error({ err: error }, 'Error disconnecting MongoDB');
  }
}

mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB disconnected');
});

mongoose.connection.on('reconnected', () => {
  logger.info('MongoDB reconnected');
});

mongoose.connection.on('error', (error) => {
  logger.error({ err: error }, 'MongoDB connection error');
});

export function isDatabaseReady() {
  return mongoose.connection.readyState === 1;
}
