/**
 * commands/website.js
 * Handles /website - links to the official college website.
 */

'use strict';

const config = require('../config');

async function websiteCommand(bot, msg) {
  const chatId = msg.chat.id;
  await bot.sendMessage(chatId, `🌐 *${config.college.name} - Official Website*\n\n${config.college.website}`, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: '🌐 Visit Website', url: config.college.website }],
        [{ text: '⬅️ Back to Main Menu', callback_data: 'menu_main' }],
      ],
    },
    disable_web_page_preview: false,
  });
}

module.exports = websiteCommand;
