import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';
import { config } from '../config';
import { logger } from '../utils/logger';

const CHANGELOG = '_migrations';
const MIGRATIONS_DIR = path.join(__dirname, '../db/migrations');

async function main() {
  await mongoose.connect(config.mongoUri);
  const db = mongoose.connection.db!;

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => (f.endsWith('.ts') || f.endsWith('.js')) && !f.endsWith('.d.ts'))
    .sort();

  const applied = await db.collection(CHANGELOG).find({}).toArray();
  const appliedMap = new Map(applied.map((a) => [a.name as string, a.appliedAt as Date]));

  console.log('\nMigration status:');
  console.log('─'.repeat(64));
  for (const file of files) {
    const date = appliedMap.get(file);
    const status = date ? `✓  ${date.toISOString()}` : '○  pending         ';
    console.log(`  ${status}  ${file}`);
  }
  console.log('─'.repeat(64));
  console.log();

  await mongoose.disconnect();
}

main().catch((err) => {
  logger.error(err);
  process.exit(1);
});
