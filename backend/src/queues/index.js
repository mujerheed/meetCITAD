/**
 * Queue Index
 * Initialize and export all queues
 */

import { createQueue } from './config.js';
import logger from '../utils/logger.js';

// Create queues
export const emailQueue = createQueue('email', {
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 3000,
    },
    removeOnComplete: 200,
  },
});

export const smsQueue = createQueue('sms', {
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: 100,
  },
});

export const notificationQueue = createQueue('notification', {
  defaultJobOptions: {
    attempts: 3,
    removeOnComplete: 100,
  },
});

export const certificateQueue = createQueue('certificate', {
  defaultJobOptions: {
    attempts: 3,
    timeout: 60000, // 1 minute timeout for certificate generation
    removeOnComplete: 50,
  },
});

export const analyticsQueue = createQueue('analytics', {
  defaultJobOptions: {
    attempts: 2,
    removeOnComplete: true, // Remove completed analytics jobs
  },
});

export const scheduledQueue = createQueue('scheduled', {
  defaultJobOptions: {
    attempts: 2,
    removeOnComplete: 50,
  },
});

// Export all queues as array for management
export const allQueues = [
  emailQueue,
  smsQueue,
  notificationQueue,
  certificateQueue,
  analyticsQueue,
  scheduledQueue,
];

/**
 * Get queue statistics
 */
export const getQueueStats = async (queueName) => {
  const queue = allQueues.find(q => q.name === queueName);
  if (!queue) {
    throw new Error(`Queue ${queueName} not found`);
  }

  const [waiting, active, completed, failed, delayed, paused] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
    queue.getDelayedCount(),
    queue.getPausedCount(),
  ]);

  return {
    name: queue.name,
    waiting,
    active,
    completed,
    failed,
    delayed,
    paused,
    total: waiting + active + completed + failed + delayed,
  };
};

/**
 * Get all queues statistics
 */
export const getAllQueuesStats = async () => {
  const stats = await Promise.all(
    allQueues.map(queue => getQueueStats(queue.name))
  );
  return stats;
};

/**
 * Clean completed jobs from all queues
 */
export const cleanAllQueues = async (grace = 3600000) => {
  logger.info(`Cleaning completed jobs older than ${grace}ms from all queues`);
  
  try {
    await Promise.all(
      allQueues.map(async (queue) => {
        await queue.clean(grace, 'completed');
        await queue.clean(grace * 2, 'failed'); // Keep failed jobs longer
        logger.info(`Queue [${queue.name}] cleaned`);
      })
    );
    
    logger.info('All queues cleaned successfully');
  } catch (error) {
    logger.error('Error cleaning queues:', error);
    throw error;
  }
};

/**
 * Pause all queues
 */
export const pauseAllQueues = async () => {
  logger.info('Pausing all queues...');
  await Promise.all(allQueues.map(q => q.pause()));
  logger.info('All queues paused');
};

/**
 * Resume all queues
 */
export const resumeAllQueues = async () => {
  logger.info('Resuming all queues...');
  await Promise.all(allQueues.map(q => q.resume()));
  logger.info('All queues resumed');
};

logger.info('All queues initialized');

export default {
  emailQueue,
  smsQueue,
  notificationQueue,
  certificateQueue,
  analyticsQueue,
  scheduledQueue,
  allQueues,
  getQueueStats,
  getAllQueuesStats,
  cleanAllQueues,
  pauseAllQueues,
  resumeAllQueues,
};
