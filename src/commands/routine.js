/**
 * commands/routine.js
 * Handles /routine - sends the latest active class routine file(s).
 */

'use strict';

const fileService = require('../services/fileService');
const keyboards = require('../utils/keyboards');

async function routineCommand(bot, msg) {
  const chatId = msg.chat.id;
  const routines = fileService.getActiveRoutines();

  if (routines.length === 0) {
    await bot.sendMessage(chatId, '📭 No class routine has been uploaded yet. Please check back later.', {
      reply_markup: keyboards.backToMenu(),
    });
    return;
  }

  await bot.sendMessage(chatId, `📅 *Class Routines* (${routines.length} available)`, { parse_mode: 'Markdown' });

  for (const routine of routines.slice(0, 10)) {
    const caption = `📅 ${routine.department} - Semester ${routine.semester}`;
    // eslint-disable-next-line no-await-in-loop
    await bot.sendDocument(chatId, routine.file_id, { caption });
  }

  await bot.sendMessage(chatId, 'That\'s all the routines currently available.', {
    reply_markup: keyboards.backToMenu(),
  });
}

module.exports = routineCommand;
