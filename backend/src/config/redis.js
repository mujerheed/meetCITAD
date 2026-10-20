import { createClient } from 'redis';
import config from './index.js';
import logger from '../utils/logger.js';

let redisClient = null;

const connectRedis = async () => {
  try {
    redisClient = createClient({
      socket: {
        host: config.redis.host,
        port: config.redis.port,
        // In development, fail fast so the API can start without Redis.
        // Production keeps retrying to survive transient outages.
        reconnectStrategy: config.isProduction
          ? (retries) => Math.min(retries * 100, 3000)
          : false,
      },
      password: config.redis.password,
      database: config.redis.db,
    });

    redisClient.on('error', err => {
      logger.error(`Redis Client Error: ${err}`);
    });

    redisClient.on('connect', () => {
      logger.info('Redis Client Connected');
    });

    redisClient.on('ready', () => {
      logger.info('Redis Client Ready');
    });

    redisClient.on('reconnecting', () => {
      logger.warn('Redis Client Reconnecting');
    });

    await redisClient.connect();

    return redisClient;
  } catch (error) {
    logger.error(`Redis connection error: ${error.message}`);
    throw error;
  }
};

const getRedisClient = () => {
  if (!redisClient) {
    throw new Error('Redis client not initialized. Call connectRedis first.');
  }
  return redisClient;
};

const disconnectRedis = async () => {
  if (redisClient) {
    await redisClient.quit();
    logger.info('Redis connection closed');
  }
};

export { connectRedis, getRedisClient, disconnectRedis };
