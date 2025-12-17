/**
 * Queue Configuration
 * Bull queue configuration and Redis connection
 */

import Queue from 'bull';
import config from '../config/index.js';
import logger from '../utils/logger.js';

/**
 * Redis connection config for Bull
 */
const redisConfig = {
  redis: {
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  },
};

/**
 * Default job options
 */
export const defaultJobOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 2000,
  },
  removeOnComplete: 100, // Keep last 100 completed jobs
  removeOnFail: 200, // Keep last 200 failed jobs for debugging
};

/**
 * Queue settings
 */
export const queueSettings = {
  stalledInterval: 30000, // Check for stalled jobs every 30 seconds
  maxStalledCount: 2, // Max times a job can be recovered from stalled state
  guardInterval: 5000, // Poll interval for new jobs
  retryProcessDelay: 5000, // Delay before processing failed jobs
};

/**
 * Create a new queue
 */
export const createQueue = (name, options = {}) => {
  try {
    const queue = new Queue(name, {
      ...redisConfig,
      settings: { ...queueSettings, ...options.settings },
      defaultJobOptions: { ...defaultJobOptions, ...options.defaultJobOptions },
    });

    // Queue event handlers
    queue.on('error', (error) => {
      logger.error(`Queue [${name}] error:`, error);
    });

    queue.on('waiting', (jobId) => {
      logger.debug(`Queue [${name}] - Job ${jobId} is waiting`);
    });

    queue.on('active', (job) => {
      logger.info(`Queue [${name}] - Job ${job.id} is active`);
    });

    queue.on('completed', (job, result) => {
      logger.info(`Queue [${name}] - Job ${job.id} completed successfully`);
    });

    queue.on('failed', (job, err) => {
      logger.error(`Queue [${name}] - Job ${job.id} failed:`, err.message);
    });

    queue.on('stalled', (job) => {
      logger.warn(`Queue [${name}] - Job ${job.id} has stalled`);
    });

    queue.on('progress', (job, progress) => {
      logger.debug(`Queue [${name}] - Job ${job.id} progress: ${progress}%`);
    });

    logger.info(`Queue [${name}] created successfully`);
    return queue;
  } catch (error) {
    logger.error(`Error creating queue [${name}]:`, error);
    throw error;
  }
};

/**
 * Graceful shutdown for all queues
 */
export const closeAllQueues = async (queues) => {
  logger.info('Closing all queues...');
  
  try {
    await Promise.all(
      queues.map(async (queue) => {
        await queue.close();
        logger.info(`Queue [${queue.name}] closed`);
      })
    );
    
    logger.info('All queues closed successfully');
  } catch (error) {
    logger.error('Error closing queues:', error);
    throw error;
  }
};

export default {
  createQueue,
  closeAllQueues,
  defaultJobOptions,
  queueSettings,
};
