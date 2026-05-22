import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';
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

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => (f.endsWith('.ts') || f.endsWith('.js')) && !f.endsWith('.d.ts'))
    .sort();

  const applied = await db.collection(CHANGELOG).find({}).toArray();
  const appliedNames = new Set(applied.map((a) => a.name as string));
  const pending = files.filter((f) => !appliedNames.has(f));

  if (pending.length === 0) {
    logger.info('No pending migrations.');
  } else {
    for (const file of pending) {
      const mod: MigrationModule = await import(path.join(MIGRATIONS_DIR, file));
      await mod.up(db);
      await db.collection(CHANGELOG).insertOne({ name: file, appliedAt: new Date() });
      logger.info(`Applied: ${file}`);
    }
    logger.info(`${pending.length} migration(s) applied.`);
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  logger.error(err);
  process.exit(1);
});
