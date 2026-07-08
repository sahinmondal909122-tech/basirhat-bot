/**
 * commands/groups.js
 * Handles /groups - lists official WhatsApp/community group links.
 */

'use strict';

const fileService = require('../services/fileService');
const keyboards = require('../utils/keyboards');

async function groupsCommand(bot, msg) {
  const chatId = msg.chat.id;
  const links = fileService.getActiveLinks('group');

  if (links.length === 0) {
    await bot.sendMessage(chatId, '📭 No group links have been added yet. Please check back later.', {
      reply_markup: keyboards.backToMenu(),
    });
    return;
  }

  const inlineButtons = links.map((link) => [{ text: `👥 ${link.label}`, url: link.url }]);
  inlineButtons.push([{ text: '⬅️ Back to Main Menu', callback_data: 'menu_main' }]);

  await bot.sendMessage(chatId, '👥 *Official WhatsApp Groups*\n\nTap a button below to join:', {
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: inlineButtons },
  });
}

module.exports = groupsCommand;
