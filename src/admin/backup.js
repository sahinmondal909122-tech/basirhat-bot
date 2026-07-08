/**
 * admin/backup.js
 * Provides on-demand database backup and CSV export of the users table,
 * delivered directly to the admin as downloadable files in chat.
 */

'use strict';

const fs = require('fs');
const backupService = require('../services/backupService');
const { logger, logActivity } = require('../logger');

function backupMenu() {
  return {
    inline_keyboard: [
      [{ text: '💾 Create Backup Now', callback_data: 'backup_now' }],
      [{ text: '📊 Export Users CSV', callback_data: 'backup_export_csv' }],
      [{ text: '⬅️ Back to Admin Menu', callback_data: 'admin_main' }],
    ],
  };
}

async function handleCallback(bot, query) {
  const data = query.data;
  const chatId = query.message.chat.id;
  const telegramId = query.from.id;
  const messageId = query.message.message_id;

  if (data === 'admin_backup') {
    await bot.editMessageText('💾 *Backup & Export*\n\nChoose an action:', {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'Markdown',
      reply_markup: backupMenu(),
    });
    return;
  }

  if (data === 'backup_now') {
    await bot.answerCallbackQuery(query.id, { text: 'Creating backup...' });
    try {
      const backupPath = backupService.performBackup();
      logActivity('BACKUP', { telegram_id: telegramId, path: backupPath });
      await bot.sendDocument(chatId, fs.createReadStream(backupPath), {
        caption: `💾 Database backup created successfully.\n📁 ${backupPath.split('/').pop()}`,
      });
    } catch (err) {
      logger.error(`Manual backup failed: ${err.message}`, { stack: err.stack });
      await bot.sendMessage(chatId, `⚠️ Backup failed: ${err.message}`);
    }
    return;
  }

  if (data === 'backup_export_csv') {
    await bot.answerCallbackQuery(query.id, { text: 'Generating CSV export...' });
    try {
      const csvPath = backupService.exportUsersToCsv();
      logActivity('EXPORT_CSV', { telegram_id: telegramId, path: csvPath });
      await bot.sendDocument(chatId, fs.createReadStream(csvPath), {
        caption: `📊 Users exported successfully.\n📁 ${csvPath.split('/').pop()}`,
      });
    } catch (err) {
      logger.error(`CSV export failed: ${err.message}`, { stack: err.stack });
      await bot.sendMessage(chatId, `⚠️ Export failed: ${err.message}`);
    }
    return;
  }
}

module.exports = { handleCallback };
