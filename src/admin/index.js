/**
 * admin/index.js
 * Entry point for the Admin Panel. Registers the /admin command and routes
 * all admin_*, bc_*, notice_*, upload_* callback queries to their respective
 * feature modules (broadcast, notices, uploads, stats, backup, maintenance).
 */

'use strict';

const { safeHandler } = require('../middleware/errorHandler');
const { requireAdmin } = require('../middleware/adminAuth');
const keyboards = require('../utils/keyboards');
const sessionManager = require('../utils/sessionManager');

const broadcast = require('./broadcast');
const notices = require('./notices');
const uploads = require('./uploads');
const stats = require('./stats');
const backup = require('./backup');
const maintenance = require('./maintenance');
const links = require('./links');

/** Registers the /admin command. */
function registerAdminCommands(bot) {
  bot.onText(
    /^\/admin$/,
    safeHandler(async (b, msg) => {
      if (!(await requireAdmin(b, msg.chat.id, msg.from.id))) return;
      await b.sendMessage(msg.chat.id, '🛠️ *Admin Panel*\n\nSelect an option below to manage the bot:', {
        parse_mode: 'Markdown',
        reply_markup: keyboards.adminMenu(),
      });
    }, '/admin')
  );
}

/**
 * Routes an admin-scoped callback_query to the correct feature module.
 * Returns true if the callback was handled here, false to let other
 * handlers (e.g. general menu callbacks) process it.
 * @param {import('node-telegram-bot-api')} bot
 * @param {import('node-telegram-bot-api').CallbackQuery} query
 */
async function handleAdminCallback(bot, query) {
  const data = query.data;
  const chatId = query.message.chat.id;
  const telegramId = query.from.id;

  const isAdminScoped =
    data.startsWith('admin_') ||
    data.startsWith('bc_') ||
    data.startsWith('notice_') ||
    data.startsWith('upload_') ||
    data.startsWith('link_') ||
    data.startsWith('confirm_') ||
    data.startsWith('cancel_') ||
    data === 'toggle_maintenance';

  if (!isAdminScoped) return false;

  if (!(await requireAdmin(bot, chatId, telegramId))) {
    return true;
  }

  if (data === 'admin_main') {
    sessionManager.clearSession(telegramId);
    await bot.editMessageText('🛠️ *Admin Panel*\n\nSelect an option below to manage the bot:', {
      chat_id: chatId,
      message_id: query.message.message_id,
      parse_mode: 'Markdown',
      reply_markup: keyboards.adminMenu(),
    });
    return true;
  }

  if (data === 'admin_broadcast' || data.startsWith('bc_')) {
    await broadcast.handleCallback(bot, query);
    return true;
  }

  if (data === 'admin_notices' || data.startsWith('notice_')) {
    await notices.handleCallback(bot, query);
    return true;
  }

  if (data === 'admin_uploads' || data.startsWith('upload_')) {
    await uploads.handleCallback(bot, query);
    return true;
  }

  if (data === 'admin_links' || data.startsWith('link_')) {
    await links.handleCallback(bot, query);
    return true;
  }

  if (data === 'admin_stats') {
    await stats.handleCallback(bot, query);
    return true;
  }

  if (data === 'admin_backup') {
    await backup.handleCallback(bot, query);
    return true;
  }

  if (data === 'admin_maintenance' || data === 'toggle_maintenance') {
    await maintenance.handleCallback(bot, query);
    return true;
  }

  if (data === 'admin_restart') {
    await bot.answerCallbackQuery(query.id, { text: 'Restarting bot...' });
    await bot.sendMessage(chatId, '🔄 Restarting the bot process now. It will be back online in a few seconds.');
    // Exit cleanly; process manager (PM2) is responsible for restarting the process.
    setTimeout(() => process.exit(0), 500);
    return true;
  }

  if (data.startsWith('confirm_') || data.startsWith('cancel_')) {
    // Generic confirm/cancel dispatch: delegate based on session context
    const session = sessionManager.getSession(telegramId);
    if (session && session.confirmHandler === 'notice_delete') {
      await notices.handleConfirmDelete(bot, query, data);
    } else if (session && session.confirmHandler === 'broadcast_send') {
      await broadcast.handleConfirmSend(bot, query, data);
    } else {
      await bot.answerCallbackQuery(query.id, { text: 'This action has expired. Please start again.' });
    }
    return true;
  }

  return false;
}

/**
 * Routes plain text/media messages that are part of an in-progress admin
 * session (multi-step flows like broadcast composing or notice creation).
 * Returns true if the message was consumed by an admin flow.
 */
async function handleAdminSessionMessage(bot, msg) {
  const session = sessionManager.getSession(msg.from.id);
  if (!session || !session.module) return false;

  switch (session.module) {
    case 'broadcast':
      return broadcast.handleSessionMessage(bot, msg, session);
    case 'notices':
      return notices.handleSessionMessage(bot, msg, session);
    case 'uploads':
      return uploads.handleSessionMessage(bot, msg, session);
    case 'links':
      return links.handleSessionMessage(bot, msg, session);
    default:
      return false;
  }
}

module.exports = { registerAdminCommands, handleAdminCallback, handleAdminSessionMessage };
