/**
 * commands/notices.js
 * Handles /notices - shows the latest notices (pinned first).
 */

'use strict';

const noticeService = require('../services/noticeService');
const keyboards = require('../utils/keyboards');
const { truncate } = require('../utils/markdown');

/**
 * Formats a list of notices into a single readable message.
 */
function formatNoticeList(notices) {
  if (notices.length === 0) {
    return '📭 There are no notices published yet. Please check back later.';
  }

  let text = `📢 *Latest Notices*\n\n`;
  notices.forEach((n, idx) => {
    const pin = n.is_pinned ? '📌 ' : '';
    const date = new Date(n.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    text += `${pin}*${idx + 1}. ${n.title}*\n${truncate(n.content, 200)}\n🗓️ ${date} | 🏷️ ${n.category}\n\n`;
  });
  return text;
}

async function noticesCommand(bot, msg) {
  const chatId = msg.chat.id;
  const notices = noticeService.getLatestNotices(10);

  await bot.sendMessage(chatId, formatNoticeList(notices), {
    parse_mode: 'Markdown',
    reply_markup: keyboards.backToMenu(),
  });
}

module.exports = noticesCommand;
module.exports.formatNoticeList = formatNoticeList;
