import http from 'http';
import app from './app';
import { config } from './config';
import { logger } from './utils/logger';
import { connectDB } from './config/db';
import { startSchedulers } from './utils/scheduler';

const server = http.createServer(app);

const startServer = async () => {
  await connectDB();
  startSchedulers();
  server.listen(config.port, () => {
    logger.info(`=================================`);
    logger.info(`  Server running in [${config.nodeEnv}] mode`);
    logger.info(`  Listening on http://localhost:${config.port}`);
    logger.info(`  API docs:  http://localhost:${config.port}/api-docs`);
    logger.info(`=================================`);
  });
};

// Handle uncaught exceptions (fatal synchronous errors)
process.on('uncaughtException', (error: Error) => {
  logger.error('UNCAUGHT EXCEPTION! Shutting down server gracefully...', error);
  process.exit(1);
});

// Handle unhandled promise rejections (fatal asynchronous errors)
process.on('unhandledRejection', (reason: unknown) => {
  logger.error('UNHANDLED REJECTION! Shutting down server gracefully...', reason);
  
  server.close(() => {
    process.exit(1);
  });
  
  // Force exit after 3 seconds if server close hangs
  setTimeout(() => {
    process.exit(1);
  }, 3000);
});

// Handle standard OS termination signals
process.on('SIGTERM', () => {
  logger.warn('SIGTERM received. Shutting down server gracefully...');
  server.close(() => {
    logger.info('Process terminated.');
    process.exit(0);
  });
});

startServer();
