/**
 * Queue Monitoring Routes
 * Admin endpoints for queue monitoring and management
 */

import express from 'express';
import { protect, restrictTo } from '../middleware/index.js';
import {
  allQueues,
  getQueueStats,
  getAllQueuesStats,
  cleanAllQueues,
  pauseAllQueues,
  resumeAllQueues,
} from '../queues/index.js';
import logger from '../utils/logger.js';

const router = express.Router();

// All queue routes require admin authentication
router.use(protect, restrictTo('admin'));

/**
 * Get all queues statistics
 * GET /api/v1/queues
 */
router.get('/', async (req, res, next) => {
  try {
    const stats = await getAllQueuesStats();

    res.json({
      success: true,
      data: { queues: stats },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get specific queue statistics
 * GET /api/v1/queues/:name
 */
router.get('/:name', async (req, res, next) => {
  try {
    const { name } = req.params;
    const stats = await getQueueStats(name);

    res.json({
      success: true,
      data: { queue: stats },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get jobs from specific queue
 * GET /api/v1/queues/:name/jobs
 */
router.get('/:name/jobs', async (req, res, next) => {
  try {
    const { name } = req.params;
    const { status = 'waiting', limit = 50 } = req.query;

    const queue = allQueues.find(q => q.name === name);
    if (!queue) {
      return res.status(404).json({
        success: false,
        message: `Queue ${name} not found`,
      });
    }

    let jobs;
    switch (status) {
      case 'waiting':
        jobs = await queue.getWaiting(0, parseInt(limit));
        break;
      case 'active':
        jobs = await queue.getActive(0, parseInt(limit));
        break;
      case 'completed':
        jobs = await queue.getCompleted(0, parseInt(limit));
        break;
      case 'failed':
        jobs = await queue.getFailed(0, parseInt(limit));
        break;
      case 'delayed':
        jobs = await queue.getDelayed(0, parseInt(limit));
        break;
      default:
        jobs = [];
    }

    const jobsData = jobs.map(job => ({
      id: job.id,
      name: job.name,
      data: job.data,
      progress: job.progress(),
      timestamp: job.timestamp,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
      failedReason: job.failedReason,
      attemptsMade: job.attemptsMade,
    }));

    res.json({
      success: true,
      data: {
        queue: name,
        status,
        count: jobsData.length,
        jobs: jobsData,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Retry failed job
 * POST /api/v1/queues/:name/jobs/:jobId/retry
 */
router.post('/:name/jobs/:jobId/retry', async (req, res, next) => {
  try {
    const { name, jobId } = req.params;

    const queue = allQueues.find(q => q.name === name);
    if (!queue) {
      return res.status(404).json({
        success: false,
        message: `Queue ${name} not found`,
      });
    }

    const job = await queue.getJob(jobId);
    if (!job) {
      return res.status(404).json({
        success: false,
        message: `Job ${jobId} not found`,
      });
    }

    await job.retry();

    logger.info(`Job ${jobId} from queue ${name} retried by admin ${req.user.id}`);

    res.json({
      success: true,
      message: 'Job retry scheduled',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Remove job
 * DELETE /api/v1/queues/:name/jobs/:jobId
 */
router.delete('/:name/jobs/:jobId', async (req, res, next) => {
  try {
    const { name, jobId } = req.params;

    const queue = allQueues.find(q => q.name === name);
    if (!queue) {
      return res.status(404).json({
        success: false,
        message: `Queue ${name} not found`,
      });
    }

    const job = await queue.getJob(jobId);
    if (!job) {
      return res.status(404).json({
        success: false,
        message: `Job ${jobId} not found`,
      });
    }

    await job.remove();

    logger.info(`Job ${jobId} from queue ${name} removed by admin ${req.user.id}`);

    res.json({
      success: true,
      message: 'Job removed successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Clean completed/failed jobs
 * POST /api/v1/queues/clean
 */
router.post('/clean', async (req, res, next) => {
  try {
    const { grace = 3600000 } = req.body; // Default 1 hour

    await cleanAllQueues(parseInt(grace));

    logger.info(`All queues cleaned by admin ${req.user.id}`);

    res.json({
      success: true,
      message: 'All queues cleaned successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Pause all queues
 * POST /api/v1/queues/pause
 */
router.post('/pause', async (req, res, next) => {
  try {
    await pauseAllQueues();

    logger.info(`All queues paused by admin ${req.user.id}`);

    res.json({
      success: true,
      message: 'All queues paused',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Resume all queues
 * POST /api/v1/queues/resume
 */
router.post('/resume', async (req, res, next) => {
  try {
    await resumeAllQueues();

    logger.info(`All queues resumed by admin ${req.user.id}`);

    res.json({
      success: true,
      message: 'All queues resumed',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Pause specific queue
 * POST /api/v1/queues/:name/pause
 */
router.post('/:name/pause', async (req, res, next) => {
  try {
    const { name } = req.params;

    const queue = allQueues.find(q => q.name === name);
    if (!queue) {
      return res.status(404).json({
        success: false,
        message: `Queue ${name} not found`,
      });
    }

    await queue.pause();

    logger.info(`Queue ${name} paused by admin ${req.user.id}`);

    res.json({
      success: true,
      message: `Queue ${name} paused`,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Resume specific queue
 * POST /api/v1/queues/:name/resume
 */
router.post('/:name/resume', async (req, res, next) => {
  try {
    const { name } = req.params;

    const queue = allQueues.find(q => q.name === name);
    if (!queue) {
      return res.status(404).json({
        success: false,
        message: `Queue ${name} not found`,
      });
    }

    await queue.resume();

    logger.info(`Queue ${name} resumed by admin ${req.user.id}`);

    res.json({
      success: true,
      message: `Queue ${name} resumed`,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
