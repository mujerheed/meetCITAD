/**
 * Queue Monitoring Routes
 * Admin endpoints for queue monitoring and management.
 * Queue modules are loaded lazily by the controller.
 */

import express from 'express';
import { protect, restrictTo, checkPermission } from '../middleware/index.js';
import { queueController } from '../controllers/index.js';

const router = express.Router();

// All queue routes require an administrator with system-settings access.
router.use(protect, restrictTo('admin'), checkPermission('manage_settings'));

// Global queue actions (static paths first)
router.get('/', queueController.getAllQueuesStatus.bind(queueController));
router.post('/pause-all', queueController.pauseAllQueuesController.bind(queueController));
router.post('/resume-all', queueController.resumeAllQueuesController.bind(queueController));
router.post('/clean-all', queueController.cleanAllQueuesController.bind(queueController));

// Single queue actions
router.get('/:queueName', queueController.getQueueStatus.bind(queueController));
router.get('/:queueName/jobs/:jobId', queueController.getJobDetails.bind(queueController));
router.post('/:queueName/pause', queueController.pauseQueue.bind(queueController));
router.post('/:queueName/resume', queueController.resumeQueue.bind(queueController));
router.post('/:queueName/clean', queueController.cleanQueue.bind(queueController));
router.post('/:queueName/jobs/:jobId/retry', queueController.retryJob.bind(queueController));
router.delete('/:queueName/jobs/:jobId', queueController.removeJob.bind(queueController));
router.delete('/:queueName/empty', queueController.emptyQueue.bind(queueController));

export default router;
