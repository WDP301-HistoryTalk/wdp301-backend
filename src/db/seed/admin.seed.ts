import bcrypt from 'bcryptjs';
import User from '../../models/user.model';
import { UserRole } from '../../types/enums';
import { logger } from '../../utils/logger';

export async function seedAdmin() {
  const exists = await User.findOne({ role: UserRole.SystemAdmin });
  if (exists) return;

  const hashedPassword = await bcrypt.hash('admin123456', 10);
  await User.create({
    name: 'System Admin',
    email: 'admin@historytalk.dev',
    password: hashedPassword,
    role: UserRole.SystemAdmin,
    token: 9999,
  });

  logger.info('Seeded admin: admin@historytalk.dev / admin123456');
}
