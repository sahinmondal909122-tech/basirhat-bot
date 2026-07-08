/**
 * commands/latest.js
 * Handles /latest - shows only the single most recent (or pinned) notice.
 */

'use strict';

const noticeService = require('../services/noticeService');
const keyboards = require('../utils/keyboards');

async function latestCommand(bot, msg) {
  const chatId = msg.chat.id;
  const notices = noticeService.getLatestNotices(1);

  if (notices.length === 0) {
    await bot.sendMessage(chatId, '📭 No notices have been published yet.', {
      reply_markup: keyboards.backToMenu(),
    });
    return;
  }

  const notice = notices[0];
  const date = new Date(notice.created_at).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const text =
    `${notice.is_pinned ? '📌 ' : '📢 '}*${notice.title}*\n\n${notice.content}\n\n🗓️ ${date} | 🏷️ ${notice.category}`;

  if (notice.file_id && notice.file_type === 'document') {
    await bot.sendDocument(chatId, notice.file_id, { caption: text, parse_mode: 'Markdown', reply_markup: keyboards.backToMenu() });
  } else if (notice.file_id && notice.file_type === 'photo') {
    await bot.sendPhoto(chatId, notice.file_id, { caption: text, parse_mode: 'Markdown', reply_markup: keyboards.backToMenu() });
  } else {
    await bot.sendMessage(chatId, text, { parse_mode: 'Markdown', reply_markup: keyboards.backToMenu() });
  }
}

module.exports = latestCommand;
