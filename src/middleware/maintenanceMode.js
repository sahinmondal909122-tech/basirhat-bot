/**
 * maintenanceMode.js
 * When maintenance mode is enabled by an admin, regular users receive a
 * friendly notice instead of normal bot responses, while admins retain
 * full access to keep managing the bot.
 */

'use strict';

const { getDb } = require('../database');
const userService = require('./../services/userService');

/** Reads the current maintenance mode flag from settings table. */
function isMaintenanceModeOn() {
  const db = getDb();
  const row = db.get('SELECT value FROM settings WHERE key = ?', ['maintenance_mode']);
  return row ? row.value === '1' : false;
}

/** Toggles maintenance mode and returns the new state. */
function setMaintenanceMode(enabled) {
  const db = getDb();
  db.run(
    `INSERT INTO settings (key, value, updated_at) VALUES ('maintenance_mode', ?, CURRENT_TIMESTAMP)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`,
    [enabled ? '1' : '0']
  );
  return enabled;
}

/**
 * Middleware-style check for use inside message/callback handlers.
 * Returns true if the request should be blocked (maintenance is on and the user isn't an admin).
 */
async function blockIfMaintenance(bot, chatId, telegramId) {
  if (!isMaintenanceModeOn()) return false;
  if (userService.isAdmin(telegramId)) return false;

  try {
    await bot.sendMessage(
      chatId,
      '🛠️ *Maintenance Mode*\n\nThe bot is currently undergoing scheduled maintenance. Please check back shortly. We apologize for the inconvenience.',
      { parse_mode: 'Markdown' }
    );
  } catch (err) {
    // ignore
  }
  return true;
}

module.exports = { isMaintenanceModeOn, setMaintenanceMode, blockIfMaintenance };
