import mongoose from 'mongoose';
import path from 'path';
import { pathToFileURL } from 'url';
import { config } from '../config';
import { logger } from '../utils/logger';

const CHANGELOG = '_migrations';
const MIGRATIONS_DIR = path.join(__dirname, '../db/migrations');

interface MigrationModule {
  up: (db: NonNullable<typeof mongoose.connection.db>) => Promise<void>;
  down: (db: NonNullable<typeof mongoose.connection.db>) => Promise<void>;
}

async function main() {
  await mongoose.connect(config.mongoUri);
  const db = mongoose.connection.db!;

  const last = await db
    .collection(CHANGELOG)
    .find({})
    .sort({ appliedAt: -1 })
    .limit(1)
    .toArray();

  if (last.length === 0) {
    logger.info('Nothing to rollback.');
    await mongoose.disconnect();
    return;
  }

  const { name } = last[0];
  const migrationUrl = pathToFileURL(path.join(MIGRATIONS_DIR, name)).href;
  const mod: MigrationModule = await import(migrationUrl);
  await mod.down(db);
  await db.collection(CHANGELOG).deleteOne({ name });
  logger.info(`Rolled back: ${name}`);

  await mongoose.disconnect();
}

main().catch((err) => {
  logger.error(err);
  process.exit(1);
});
