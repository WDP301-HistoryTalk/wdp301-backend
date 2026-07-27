import http from 'http';
import app from './app';
import { config } from './config';
import { logger } from './utils/logger';
import { connectDB } from './config/db';
import { startSchedulers } from './utils/scheduler';

const server = http.createServer(app);

// Node mac dinh requestTimeout = 5 phut (chong slow-loris) — qua ngan cho
// request OCR PDF nhieu trang (Tesseract ~4-5s/trang, file 100+ trang co the
// mat 9-10 phut). Noi rong de request khong bi Node tu ngat giua chung.
server.requestTimeout = 15 * 60 * 1000; // 15 phut

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
