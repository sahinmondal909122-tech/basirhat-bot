/**
 * commands/about.js
 * Handles /about - shows information about the college and this bot.
 */

'use strict';

const config = require('../config');
const keyboards = require('../utils/keyboards');

async function aboutCommand(bot, msg) {
  const chatId = msg.chat.id;
  const aboutText =
    `🏛️ *About ${config.college.name}*\n\n` +
    `This official Telegram bot keeps students and staff updated with the latest notices, ` +
    `class routines, examination results, syllabus copies and important WhatsApp group links — all in one convenient place.\n\n` +
    `🌐 Website: ${config.college.website}\n` +
    `📍 Address: ${config.college.address || 'Not configured'}\n\n` +
    `🤖 Bot maintained by the College Tech Team.\n` +
    `Have suggestions? Use /contact to reach an administrator.`;

  await bot.sendMessage(chatId, aboutText, {
    parse_mode: 'Markdown',
    reply_markup: keyboards.backToMenu(),
    disable_web_page_preview: true,
  });
}

module.exports = aboutCommand;
