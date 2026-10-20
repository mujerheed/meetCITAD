import config from './config/index.js';
import connectDB from './config/database.js';
import { connectRedis } from './config/redis.js';
import logger from './utils/logger.js';
import { closeAllQueues } from './queues/config.js';

// Handle uncaught exceptions
process.on('uncaughtException', err => {
  logger.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  logger.error(err.name, err.message);
  logger.error(err.stack);
  process.exit(1);
});

// Connect to database and start server
const startServer = async () => {
  try {
    logger.info('Starting server initialization...');
    
    // Connect to MongoDB (skip if in test mode)
    if (process.env.SKIP_DB_CONNECTION !== 'true') {
      logger.info('Connecting to databases...');
      await connectDB();

      // Redis powers caching, rate limiting and Bull queues. In development we
      // allow the API to run without it; production fails fast.
      let redisReady = false;
      try {
        await connectRedis();
        redisReady = true;
      } catch (error) {
        if (config.isProduction) {
          throw error;
        }
        logger.warn(
          'Redis unavailable - continuing without Redis. ' +
            'Rate limiting will use memory and background queues are disabled.'
        );
      }

      if (redisReady) {
        // Initialize queue processors (requires Redis)
        logger.info('Loading queue processors...');
        const { allQueues } = await import('./queues/index.js');
        await import('./queues/processors/index.js');
        const { setupRecurringJobs } = await import(
          './queues/processors/scheduled.processor.js'
        );

        // Setup recurring jobs (event reminders, analytics, cleanup)
        logger.info('Setting up recurring jobs...');
        await setupRecurringJobs();
        logger.info(`✅ Recurring jobs configured`);
        logger.info(
          `⚙️  Worker queues: ${allQueues.length} active queues processing jobs`
        );
      } else {
        logger.warn('⚠️  Worker queues disabled (Redis required)');
      }
    } else {
      logger.warn('⚠️  Running in TEST MODE - Database connections skipped!');
      logger.warn('⚠️  Worker queues disabled (Redis required)');
      logger.warn('⚠️  Install MongoDB and Redis for full functionality');
    }
    
    logger.info('Attempting to start HTTP server...');

    // Import the app only after Redis/Mongo initialization so rate limiters and
    // other infrastructure-dependent modules see the live clients.
    const { default: app } = await import('./app.js');

    // Start server
    const server = app.listen(config.port, () => {
      logger.info(`🚀 Server running in ${config.env} mode on port ${config.port}`);
      logger.info(`📡 API: http://localhost:${config.port}/api/${config.apiVersion}`);
      if (config.isDevelopment) {
        logger.info(`📚 Documentation: http://localhost:${config.port}/api-docs`);
      }
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (err, promise) => {
      logger.error('UNHANDLED REJECTION! 💥 Shutting down...');
      logger.error(err.name, err.message);
      logger.error(err.stack);
      logger.error('Promise:', promise);
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
          // Close all queues (if initialized)
          if (process.env.SKIP_DB_CONNECTION !== 'true') {
            const { allQueues } = await import('./queues/index.js');
            await closeAllQueues(allQueues);
          }
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
