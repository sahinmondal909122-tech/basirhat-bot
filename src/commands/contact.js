/**
 * commands/contact.js
 * Handles /contact - shows admin contact details for support/queries.
 */

'use strict';

const config = require('../config');
const keyboards = require('../utils/keyboards');

async function contactCommand(bot, msg) {
  const chatId = msg.chat.id;
  const contactText =
    `📞 *Contact ${config.college.name}*\n\n` +
    `📧 Email: ${config.college.contactEmail || 'Not configured'}\n` +
    `☎️ Phone: ${config.college.contactPhone || 'Not configured'}\n` +
    `📍 Address: ${config.college.address || 'Not configured'}\n\n` +
    `For urgent bot-related issues, please message an administrator directly through the college office.`;

  await bot.sendMessage(chatId, contactText, {
    parse_mode: 'Markdown',
    reply_markup: keyboards.backToMenu(),
  });
}

module.exports = contactCommand;
