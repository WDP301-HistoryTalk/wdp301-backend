import mongoose from 'mongoose';
import { connectDB } from '../config/db';
import { runAllSeeds } from '../db/seed';
import { logger } from '../utils/logger';

async function main() {
  await connectDB();
  await runAllSeeds();
  logger.info('Seeding complete');
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
