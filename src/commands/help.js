/**
 * commands/help.js
 * Handles /help - lists every available command with a short description.
 */

'use strict';

const keyboards = require('../utils/keyboards');

async function helpCommand(bot, msg) {
  const chatId = msg.chat.id;
  const helpText =
    `📖 *Available Commands*\n\n` +
    `/start - Show the welcome message and main menu\n` +
    `/help - Show this help message\n` +
    `/about - Learn more about this bot\n` +
    `/contact - Get admin contact details\n` +
    `/notices - View the latest notices\n` +
    `/routine - Get the class routine\n` +
    `/results - Get exam results\n` +
    `/syllabus - Get the syllabus\n` +
    `/groups - Get WhatsApp group links\n` +
    `/website - Get the official college website\n` +
    `/search <keyword> - Search notices by keyword\n` +
    `/latest - Show the most recent notice\n\n` +
    `You can also use the buttons in the main menu for quick access to everything above.`;

  await bot.sendMessage(chatId, helpText, {
    parse_mode: 'Markdown',
    reply_markup: keyboards.backToMenu(),
  });
}

module.exports = helpCommand;
