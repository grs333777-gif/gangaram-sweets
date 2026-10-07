import User from '../models/User.js';
import logger from '../config/logger.js';
import { ROLES } from '../constants/index.js';

/**
 * Creates the shop desk account once. Later password changes in the database are kept.
 */
export async function seedAdminIfMissing() {
  const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || '';
  const phone = (process.env.ADMIN_PHONE || '').trim();
  if (!email || !phone || password.length < 12) {
    logger.warn('Admin desk account is not configured');
    return;
  }

  const existing = await User.findOne({ email });
  if (existing) {
    if (existing.role !== ROLES.ADMIN) {
      existing.role = ROLES.ADMIN;
      await existing.save();
    }
    return;
  }

  const user = new User({
    name: 'Shop desk',
    email,
    phone,
    password,
    role: ROLES.ADMIN,
  });
  await user.save();
  logger.info({ email }, 'Admin desk account ready');
}
