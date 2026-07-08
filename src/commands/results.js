/**
 * commands/results.js
 * Handles /results - sends the latest active examination results.
 */

'use strict';

const fileService = require('../services/fileService');
const keyboards = require('../utils/keyboards');

async function resultsCommand(bot, msg) {
  const chatId = msg.chat.id;
  const results = fileService.getActiveResults();

  if (results.length === 0) {
    await bot.sendMessage(chatId, '📭 No results have been published yet. Please check back later.', {
      reply_markup: keyboards.backToMenu(),
    });
    return;
  }

  await bot.sendMessage(chatId, `📝 *Results* (${results.length} available)`, { parse_mode: 'Markdown' });

  for (const result of results.slice(0, 10)) {
    const caption = `📝 ${result.exam_name}${result.department ? ` - ${result.department}` : ''}${
      result.semester ? ` (Semester ${result.semester})` : ''
    }`;
    // eslint-disable-next-line no-await-in-loop
    await bot.sendDocument(chatId, result.file_id, { caption });
  }

  await bot.sendMessage(chatId, 'That\'s all the results currently available.', {
    reply_markup: keyboards.backToMenu(),
  });
}

module.exports = resultsCommand;
