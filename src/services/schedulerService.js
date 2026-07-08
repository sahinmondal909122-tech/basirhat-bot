/**
 * schedulerService.js
 * Runs periodic background jobs:
 *  - Checks for due scheduled broadcasts every minute and dispatches them.
 *  - Performs automatic database backups on an interval defined in config.
 */

'use strict';

const cron = require('node-cron');
const config = require('../config');
const { logger } = require('../logger');
const broadcastService = require('./broadcastService');
const { performBackup } = require('./backupService');

/**
 * Starts all scheduled background jobs.
 * @param {import('node-telegram-bot-api')} bot
 */
function startSchedulers(bot) {
  // Check every minute for scheduled broadcasts that are now due.
  cron.schedule('* * * * *', async () => {
    try {
      const due = broadcastService.getDueScheduledBroadcasts();
      for (const broadcast of due) {
        logger.info(`Dispatching scheduled broadcast #${broadcast.id}`);
        await broadcastService.executeBroadcast(bot, broadcast.id, broadcast.admin_id);
      }
    } catch (err) {
      logger.error(`Scheduled broadcast check failed: ${err.message}`, { stack: err.stack });
    }
  });

  // Automatic database backup on the configured interval (converted to a cron expression).
  const intervalHours = Math.max(config.backup.intervalHours, 1);
  const cronExpression = `0 */${intervalHours} * * *`; // every N hours, at minute 0
  cron.schedule(cronExpression, () => {
    try {
      const backupPath = performBackup();
      logger.info(`Automatic backup completed: ${backupPath}`);
    } catch (err) {
      logger.error(`Automatic backup failed: ${err.message}`, { stack: err.stack });
    }
  });

  logger.info(`Schedulers started (broadcast check: every minute, backup: every ${intervalHours}h)`);
}

module.exports = { startSchedulers };
