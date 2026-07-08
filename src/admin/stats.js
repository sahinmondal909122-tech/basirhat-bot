/**
 * admin/stats.js
 * Displays bot usage statistics: total users, active users, new users today,
 * total notices, and recent broadcast summaries.
 */

'use strict';

const keyboards = require('../utils/keyboards');
const userService = require('../services/userService');
const noticeService = require('../services/noticeService');
const broadcastService = require('../services/broadcastService');

async function handleCallback(bot, query) {
  const chatId = query.message.chat.id;
  const messageId = query.message.message_id;

  const totalUsers = userService.getTotalUserCount();
  const activeUsers7d = userService.getActiveUserCount(7);
  const activeUsers30d = userService.getActiveUserCount(30);
  const newToday = userService.getNewUsersToday();
  const noticeCount = noticeService.getNoticeCount();
  const recentBroadcasts = broadcastService.getRecentBroadcasts(5);

  let text =
    `📊 *Bot Statistics*\n\n` +
    `👥 Total Users: ${totalUsers}\n` +
    `🟢 Active (7 days): ${activeUsers7d}\n` +
    `🟢 Active (30 days): ${activeUsers30d}\n` +
    `🆕 New Today: ${newToday}\n` +
    `📢 Total Notices: ${noticeCount}\n\n` +
    `*Recent Broadcasts:*\n`;

  if (recentBroadcasts.length === 0) {
    text += 'No broadcasts sent yet.';
  } else {
    recentBroadcasts.forEach((b) => {
      text += `#${b.id} [${b.status}] ${b.content_type} - ✅${b.success_count} ❌${b.failed_count}\n`;
    });
  }

  await bot.editMessageText(text, {
    chat_id: chatId,
    message_id: messageId,
    parse_mode: 'Markdown',
    reply_markup: keyboards.adminMenu(),
  });
}

module.exports = { handleCallback };
