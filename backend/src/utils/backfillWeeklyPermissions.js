import mongoose from 'mongoose';
import connectDB from '../config/database.js';
import Admin from '../models/Admin.js';
import logger from './logger.js';

/**
 * Grant the new Weekly Program permissions to existing administrators.
 *
 * The Admin model only applies role presets when a role changes or an account
 * is created, so deployed accounts need a one-time additive migration.
 *
 * Usage:
 *   node src/utils/backfillWeeklyPermissions.js
 */
async function run() {
  await connectDB();

  const publishers = await Admin.updateMany(
    { role: { $in: ['super_admin', 'event_manager'] } },
    {
      $addToSet: {
        permissions: {
          $each: ['manage_weekly_programs', 'publish_weekly_programs'],
        },
      },
    }
  );

  const managers = await Admin.updateMany(
    { role: 'staff' },
    { $addToSet: { permissions: 'manage_weekly_programs' } }
  );

  logger.info(
    `Weekly permissions backfilled: ${publishers.modifiedCount} publisher account(s), ${managers.modifiedCount} manager account(s).`
  );

  await mongoose.connection.close();
}

run().catch(async (error) => {
  logger.error(`Weekly permissions backfill failed: ${error.message}`);
  await mongoose.connection.close();
  process.exitCode = 1;
});
