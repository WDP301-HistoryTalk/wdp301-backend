import mongoose from 'mongoose';
import { config } from './index';
import { logger } from '../utils/logger';

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(config.mongoUri);
    logger.info(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error(`Error connecting to MongoDB: ${msg}`);
    process.exit(1); // Exit process with failure
  }
};

mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB disconnected');
});

mongoose.connection.on('error', (err) => {
  logger.error(`MongoDB connection error: ${err}`);
});
