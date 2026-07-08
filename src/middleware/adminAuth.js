/**
 * adminAuth.js
 * Guards admin-only bot actions. Verifies the requesting Telegram user's
 * numeric ID against the ADMIN_IDS allow-list from config/environment.
 */

'use strict';

const userService = require('../services/userService');
const { logger } = require('../logger');

/**
 * Checks admin status and optionally notifies the user if unauthorized.
 * @param {import('node-telegram-bot-api')} bot
 * @param {number} chatId
 * @param {number} telegramId
 * @returns {Promise<boolean>} true if the user is a verified admin
 */
async function requireAdmin(bot, chatId, telegramId) {
  if (userService.isAdmin(telegramId)) return true;

  logger.warn(`Unauthorized admin access attempt by user ${telegramId}`);
  try {
    await bot.sendMessage(chatId, '⛔ This action is restricted to college administrators only.');
  } catch (err) {
    // ignore send failures
  }
  return false;
}

module.exports = { requireAdmin };
