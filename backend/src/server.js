import app from './app.js';
import config from './config/index.js';
import connectDB from './config/database.js';
import { connectRedis } from './config/redis.js';
import logger from './utils/logger.js';
import { allQueues } from './queues/index.js';
import { closeAllQueues } from './queues/config.js';
import './queues/processors/index.js'; // Initialize queue processors
import { setupRecurringJobs } from './queues/processors/scheduled.processor.js';

// Handle uncaught exceptions
process.on('uncaughtException', err => {
  logger.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  logger.error(err.name, err.message);
  process.exit(1);
});

// Connect to database and start server
const startServer = async () => {
  try {
    // Connect to MongoDB (skip if in test mode)
    if (process.env.SKIP_DB_CONNECTION !== 'true') {
      await connectDB();
      // Connect to Redis
      await connectRedis();
      
      // Setup recurring jobs (event reminders, analytics, cleanup)
      await setupRecurringJobs();
      logger.info('✅ Recurring jobs configured');
    } else {
      logger.warn('⚠️  Running in TEST MODE - Database connections skipped!');
      logger.warn('⚠️  Install MongoDB and Redis for full functionality');
    }

    // Start server
    const server = app.listen(config.port, () => {
      logger.info(`🚀 Server running in ${config.env} mode on port ${config.port}`);
      logger.info(`📡 API: http://localhost:${config.port}/api/${config.apiVersion}`);
      logger.info(`⚙️  Worker queues: ${allQueues.length} active queues processing jobs`);
      if (config.isDevelopment) {
        logger.info(`📚 Documentation: http://localhost:${config.port}/api-docs`);
      }
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', err => {
      logger.error('UNHANDLED REJECTION! 💥 Shutting down...');
      logger.error(err.name, err.message);
      server.close(() => {
        process.exit(1);
      });
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal) => {
      logger.info(`${signal} received. Shutting down gracefully...`);
      
      // Close server first
      server.close(async () => {
        try {
          // Close all queues
          await closeAllQueues(allQueues);
          logger.info('Process terminated!');
          process.exit(0);
        } catch (error) {
          logger.error('Error during shutdown:', error);
          process.exit(1);
        }
      });

      // Force shutdown after 30 seconds
      setTimeout(() => {
        logger.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 30000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    logger.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  }
};

startServer();
