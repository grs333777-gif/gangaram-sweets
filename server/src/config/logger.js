import pino from 'pino';
import config from './env.js';

const logger = pino({
  level: config.LOG_LEVEL,
  ...(config.LOG_PRETTY
    ? {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:yyyy-mm-dd HH:MM:ss.l',
            ignore: 'pid,hostname',
          },
        },
      }
    : {}),
  serializers: {
    err: pino.stdSerializers.err,
    req: (req) => ({
      method: req.method,
      url: req.url,
      requestId: req.id,
    }),
    res: (res) => ({
      statusCode: res.statusCode,
    }),
  },
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'password',
      'refreshToken',
      'accessToken',
      'resetToken',
      'token',
    ],
    censor: '[REDACTED]',
  },
});

export default logger;
