/**
 * commands/syllabus.js
 * Handles /syllabus - sends the latest active syllabus documents.
 */

'use strict';

const fileService = require('../services/fileService');
const keyboards = require('../utils/keyboards');

async function syllabusCommand(bot, msg) {
  const chatId = msg.chat.id;
  const syllabusList = fileService.getActiveSyllabus();

  if (syllabusList.length === 0) {
    await bot.sendMessage(chatId, '📭 No syllabus has been uploaded yet. Please check back later.', {
      reply_markup: keyboards.backToMenu(),
    });
    return;
  }

  await bot.sendMessage(chatId, `📄 *Syllabus* (${syllabusList.length} available)`, { parse_mode: 'Markdown' });

  for (const item of syllabusList.slice(0, 10)) {
    const caption = `📄 ${item.department}${item.semester ? ` - Semester ${item.semester}` : ''}`;
    // eslint-disable-next-line no-await-in-loop
    await bot.sendDocument(chatId, item.file_id, { caption });
  }

  await bot.sendMessage(chatId, 'That\'s all the syllabus documents currently available.', {
    reply_markup: keyboards.backToMenu(),
  });
}

module.exports = syllabusCommand;
