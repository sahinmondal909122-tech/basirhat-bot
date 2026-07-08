/**
 * manualBackup.js
 * Standalone script to trigger a database backup from the command line,
 * without needing to go through the Telegram admin panel.
 * Usage: npm run backup
 */

'use strict';

const { initDatabase } = require('../database');
const backupService = require('../services/backupService');

initDatabase();

try {
  const backupPath = backupService.performBackup();
  // eslint-disable-next-line no-console
  console.log(`✅ Backup created successfully: ${backupPath}`);
  process.exit(0);
} catch (err) {
  // eslint-disable-next-line no-console
  console.error(`❌ Backup failed: ${err.message}`);
  process.exit(1);
}
