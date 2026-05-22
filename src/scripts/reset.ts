import mongoose from 'mongoose';
import { connectDB } from '../config/db';
import { runAllSeeds } from '../db/seed';
import { logger } from '../utils/logger';

async function main() {
  await connectDB();

  const db = mongoose.connection.db!;
  const collections = await db.listCollections().toArray();

  for (const col of collections) {
    await db.dropCollection(col.name);
    logger.warn(`Dropped: ${col.name}`);
  }

  await runAllSeeds();
  logger.info('Reset complete');
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
