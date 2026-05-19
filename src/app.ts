import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import 'express-async-errors'; // Handles async controller exceptions automatically
import { config } from './config';
import apiRouter from './routes';
import { errorHandler } from './middlewares/error.middleware';
import { AppError } from './utils/app-error';
import { logger } from './utils/logger';

const app = express();

// Set security HTTP headers
app.use(helmet());

// Enable CORS
app.use(
  cors({
    origin: config.corsOrigin,
    credentials: true,
  })
);

// HTTP request logging
if (config.nodeEnv === 'development') {
  app.use(morgan('dev'));
} else {
  // Production simple logs
  app.use(morgan('combined'));
}

// Parse JSON and urlencoded request bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Standard health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'success',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    env: config.nodeEnv,
  });
});

// Register api router
app.use('/api', apiRouter);

// Fallback error for undefined routes
app.use('*', (req: Request, res: Response, next: NextFunction) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Register global error middleware
app.use(errorHandler);

export default app;
