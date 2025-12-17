/**
 * Queue Controller
 * Manages queue monitoring and administration
 */

import {
  allQueues,
  getQueueStats,
  getAllQueuesStats,
  cleanAllQueues,
  pauseAllQueues,
  resumeAllQueues,
} from '../queues/index.js';
import logger from '../utils/logger.js';
import { AppError } from '../middleware/errorHandler.js';

class QueueController {
  /**
   * Get All Queues Status
   * GET /api/v1/admin/queues
   */
  async getAllQueuesStatus(req, res, next) {
    try {
      const stats = await getAllQueuesStats();

      res.json({
        success: true,
        data: {
          queues: stats,
          totalQueues: stats.length,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get Single Queue Status
   * GET /api/v1/admin/queues/:queueName
   */
  async getQueueStatus(req, res, next) {
    try {
      const { queueName } = req.params;

      const queue = allQueues.find((q) => q.name === queueName);
      if (!queue) {
        throw new AppError(`Queue '${queueName}' not found`, 404);
      }

      const stats = await getQueueStats(queueName);

      // Get recent jobs
      const [waitingJobs, activeJobs, failedJobs, completedJobs] = await Promise.all([
        queue.getWaiting(0, 10),
        queue.getActive(0, 10),
        queue.getFailed(0, 10),
        queue.getCompleted(0, 10),
      ]);

      res.json({
        success: true,
        data: {
          stats,
          recentJobs: {
            waiting: waitingJobs.map(this.formatJob),
            active: activeJobs.map(this.formatJob),
            failed: failedJobs.map(this.formatJob),
            completed: completedJobs.map(this.formatJob),
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get Queue Job Details
   * GET /api/v1/admin/queues/:queueName/jobs/:jobId
   */
  async getJobDetails(req, res, next) {
    try {
      const { queueName, jobId } = req.params;

      const queue = allQueues.find((q) => q.name === queueName);
      if (!queue) {
        throw new AppError(`Queue '${queueName}' not found`, 404);
      }

      const job = await queue.getJob(jobId);
      if (!job) {
        throw new AppError(`Job '${jobId}' not found in queue '${queueName}'`, 404);
      }

      const jobData = {
        id: job.id,
        name: job.name,
        data: job.data,
        opts: job.opts,
        progress: job.progress,
        delay: job.delay,
        timestamp: job.timestamp,
        attemptsMade: job.attemptsMade,
        failedReason: job.failedReason,
        stacktrace: job.stacktrace,
        returnvalue: job.returnvalue,
        finishedOn: job.finishedOn,
        processedOn: job.processedOn,
      };

      res.json({
        success: true,
        data: { job: jobData },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Pause Queue
   * POST /api/v1/admin/queues/:queueName/pause
   */
  async pauseQueue(req, res, next) {
    try {
      const { queueName } = req.params;

      const queue = allQueues.find((q) => q.name === queueName);
      if (!queue) {
        throw new AppError(`Queue '${queueName}' not found`, 404);
      }

      await queue.pause();

      logger.info(`Queue '${queueName}' paused by admin ${req.user.id}`);

      res.json({
        success: true,
        message: `Queue '${queueName}' has been paused`,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Resume Queue
   * POST /api/v1/admin/queues/:queueName/resume
   */
  async resumeQueue(req, res, next) {
    try {
      const { queueName } = req.params;

      const queue = allQueues.find((q) => q.name === queueName);
      if (!queue) {
        throw new AppError(`Queue '${queueName}' not found`, 404);
      }

      await queue.resume();

      logger.info(`Queue '${queueName}' resumed by admin ${req.user.id}`);

      res.json({
        success: true,
        message: `Queue '${queueName}' has been resumed`,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Pause All Queues
   * POST /api/v1/admin/queues/pause-all
   */
  async pauseAllQueuesController(req, res, next) {
    try {
      await pauseAllQueues();

      logger.info(`All queues paused by admin ${req.user.id}`);

      res.json({
        success: true,
        message: 'All queues have been paused',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Resume All Queues
   * POST /api/v1/admin/queues/resume-all
   */
  async resumeAllQueuesController(req, res, next) {
    try {
      await resumeAllQueues();

      logger.info(`All queues resumed by admin ${req.user.id}`);

      res.json({
        success: true,
        message: 'All queues have been resumed',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Clean Queue
   * POST /api/v1/admin/queues/:queueName/clean
   */
  async cleanQueue(req, res, next) {
    try {
      const { queueName } = req.params;
      const { grace = 3600000, status = 'completed' } = req.body; // Default 1 hour

      const queue = allQueues.find((q) => q.name === queueName);
      if (!queue) {
        throw new AppError(`Queue '${queueName}' not found`, 404);
      }

      const jobs = await queue.clean(grace, status);

      logger.info(`Queue '${queueName}' cleaned: ${jobs.length} jobs removed by admin ${req.user.id}`);

      res.json({
        success: true,
        message: `${jobs.length} ${status} jobs removed from queue '${queueName}'`,
        data: { removedCount: jobs.length },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Clean All Queues
   * POST /api/v1/admin/queues/clean-all
   */
  async cleanAllQueuesController(req, res, next) {
    try {
      const { grace = 3600000 } = req.body;

      await cleanAllQueues(grace);

      logger.info(`All queues cleaned by admin ${req.user.id}`);

      res.json({
        success: true,
        message: 'All queues have been cleaned',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Retry Failed Job
   * POST /api/v1/admin/queues/:queueName/jobs/:jobId/retry
   */
  async retryJob(req, res, next) {
    try {
      const { queueName, jobId } = req.params;

      const queue = allQueues.find((q) => q.name === queueName);
      if (!queue) {
        throw new AppError(`Queue '${queueName}' not found`, 404);
      }

      const job = await queue.getJob(jobId);
      if (!job) {
        throw new AppError(`Job '${jobId}' not found`, 404);
      }

      await job.retry();

      logger.info(`Job ${jobId} in queue '${queueName}' retried by admin ${req.user.id}`);

      res.json({
        success: true,
        message: `Job ${jobId} has been queued for retry`,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Remove Job
   * DELETE /api/v1/admin/queues/:queueName/jobs/:jobId
   */
  async removeJob(req, res, next) {
    try {
      const { queueName, jobId } = req.params;

      const queue = allQueues.find((q) => q.name === queueName);
      if (!queue) {
        throw new AppError(`Queue '${queueName}' not found`, 404);
      }

      const job = await queue.getJob(jobId);
      if (!job) {
        throw new AppError(`Job '${jobId}' not found`, 404);
      }

      await job.remove();

      logger.info(`Job ${jobId} removed from queue '${queueName}' by admin ${req.user.id}`);

      res.json({
        success: true,
        message: `Job ${jobId} has been removed`,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Empty Queue
   * DELETE /api/v1/admin/queues/:queueName/empty
   */
  async emptyQueue(req, res, next) {
    try {
      const { queueName } = req.params;

      const queue = allQueues.find((q) => q.name === queueName);
      if (!queue) {
        throw new AppError(`Queue '${queueName}' not found`, 404);
      }

      await queue.empty();

      logger.warn(`Queue '${queueName}' emptied by admin ${req.user.id}`);

      res.json({
        success: true,
        message: `Queue '${queueName}' has been emptied`,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Helper: Format job for response
   */
  formatJob(job) {
    return {
      id: job.id,
      name: job.name,
      data: job.data,
      progress: job.progress,
      attemptsMade: job.attemptsMade,
      timestamp: job.timestamp,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
      failedReason: job.failedReason,
    };
  }
}

export default new QueueController();
