/**
 * userService.js
 * Handles all user-related database operations: auto-save on first contact,
 * activity tracking, admin flag resolution, and statistics for the admin panel.
 */

'use strict';

const { getDb } = require('../database');
const config = require('../config');
const { logger, logActivity } = require('../logger');

/**
 * Ensures a Telegram user exists in the database. Inserts on first contact,
 * otherwise updates last_seen_at and profile fields (auto save + duplicate protection).
 * @param {import('node-telegram-bot-api').User} tgUser
 * @returns {{isNew: boolean}}
 */
function upsertUser(tgUser) {
  const db = getDb();
  const existing = db.get('SELECT id FROM users WHERE telegram_id = ?', [tgUser.id]);
  const isAdmin = config.admin.ids.includes(tgUser.id) ? 1 : 0;

  if (existing) {
    db.run(
      `UPDATE users
       SET username = ?, first_name = ?, last_name = ?, language_code = ?,
           is_admin = ?, is_active = 1, last_seen_at = CURRENT_TIMESTAMP
       WHERE telegram_id = ?`,
      [
        tgUser.username || null,
        tgUser.first_name || null,
        tgUser.last_name || null,
        tgUser.language_code || null,
        isAdmin,
        tgUser.id,
      ]
    );
    return { isNew: false };
  }

  db.run(
    `INSERT INTO users (telegram_id, username, first_name, last_name, language_code, is_admin)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      tgUser.id,
      tgUser.username || null,
      tgUser.first_name || null,
      tgUser.last_name || null,
      tgUser.language_code || null,
      isAdmin,
    ]
  );
  logActivity('USER_JOIN', { telegram_id: tgUser.id, username: tgUser.username });
  logger.info(`New user joined: ${tgUser.id} (${tgUser.username || 'no-username'})`);
  return { isNew: true };
}

/** Marks a user inactive (e.g. bot was blocked / user left). */
function markUserInactive(telegramId) {
  const db = getDb();
  db.run('UPDATE users SET is_active = 0, is_blocked = 1 WHERE telegram_id = ?', [telegramId]);
  logActivity('USER_LEAVE', { telegram_id: telegramId });
}

/** Marks a user active again (e.g. unblocked bot and sent a new message). */
function markUserActive(telegramId) {
  const db = getDb();
  db.run(
    'UPDATE users SET is_active = 1, is_blocked = 0, last_seen_at = CURRENT_TIMESTAMP WHERE telegram_id = ?',
    [telegramId]
  );
}

/** Returns all active users (used for broadcasts). */
function getActiveUsers() {
  const db = getDb();
  return db.all('SELECT telegram_id, username, first_name FROM users WHERE is_active = 1 AND is_blocked = 0');
}

/** Returns total registered user count. */
function getTotalUserCount() {
  const db = getDb();
  const row = db.get('SELECT COUNT(*) AS count FROM users');
  return row.count;
}

/** Returns count of users active within the last N days. */
function getActiveUserCount(days = 7) {
  const db = getDb();
  const row = db.get(
    `SELECT COUNT(*) AS count FROM users
     WHERE is_active = 1 AND is_blocked = 0
       AND last_seen_at >= datetime('now', '-' || ? || ' days')`,
    [days]
  );
  return row.count;
}

/** Returns count of new users who joined today. */
function getNewUsersToday() {
  const db = getDb();
  const row = db.get(
    `SELECT COUNT(*) AS count FROM users WHERE date(joined_at) = date('now')`
  );
  return row.count;
}

/** Checks whether a Telegram numeric ID belongs to a configured admin. */
function isAdmin(telegramId) {
  return config.admin.ids.includes(Number(telegramId));
}

/** Fetches all users for CSV export. */
function getAllUsersForExport() {
  const db = getDb();
  return db.all(
    `SELECT telegram_id, username, first_name, last_name, language_code,
            is_admin, is_blocked, is_active, joined_at, last_seen_at
     FROM users ORDER BY joined_at DESC`
  );
}

module.exports = {
  upsertUser,
  markUserInactive,
  markUserActive,
  getActiveUsers,
  getTotalUserCount,
  getActiveUserCount,
  getNewUsersToday,
  isAdmin,
  getAllUsersForExport,
};
