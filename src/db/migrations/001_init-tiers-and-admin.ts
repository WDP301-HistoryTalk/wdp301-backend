import type { Db } from 'mongodb';
import bcrypt from 'bcryptjs';
import { TierTitle, UserRole } from '../../types/enums';

const TIERS = [
  { title: TierTitle.Free, amount: 0, limitedToken: 10 },
  { title: TierTitle.Plus, amount: 99000, limitedToken: 100 },
  { title: TierTitle.Pro, amount: 299000, limitedToken: 500 },
];

export async function up(db: Db): Promise<void> {
  const now = new Date();

  for (const tier of TIERS) {
    await db.collection('tiers').updateOne(
      { title: tier.title },
      { $setOnInsert: { ...tier, createdAt: now, updatedAt: now } },
      { upsert: true }
    );
  }

  const adminExists = await db.collection('users').findOne({ role: UserRole.SystemAdmin });
  if (!adminExists) {
    const hashed = await bcrypt.hash('admin123456', 10);
    await db.collection('users').insertOne({
      userName: 'System Admin',
      email: 'admin@historytalk.dev',
      password: hashed,
      role: UserRole.SystemAdmin,
      token: 9999,
      createdAt: now,
      updatedAt: now,
    });
  }
}

export async function down(db: Db): Promise<void> {
  await db.collection('tiers').deleteMany({ title: { $in: Object.values(TierTitle) } });
  await db.collection('users').deleteOne({ email: 'admin@historytalk.dev' });
}
