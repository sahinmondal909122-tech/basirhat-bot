/**
 * commands/materials.js
 * Powers the "📚 Study Materials" main menu button - lists uploaded study materials.
 */

'use strict';

const fileService = require('../services/fileService');
const keyboards = require('../utils/keyboards');
const { formatFileSize } = require('../utils/fileHelper');

async function materialsCommand(bot, msg) {
  const chatId = msg.chat.id;
  const materials = fileService.getFilesByCategory('material', 15);

  if (materials.length === 0) {
    await bot.sendMessage(chatId, '📭 No study materials have been uploaded yet. Please check back later.', {
      reply_markup: keyboards.backToMenu(),
    });
    return;
  }

  await bot.sendMessage(chatId, `📚 *Study Materials* (${materials.length} available)`, { parse_mode: 'Markdown' });

  for (const file of materials) {
    const caption = `📚 ${file.file_name || 'Study Material'}${
      file.subject_or_dept ? `\n📘 ${file.subject_or_dept}` : ''
    }${file.file_size ? `\n💾 ${formatFileSize(file.file_size)}` : ''}`;
    // eslint-disable-next-line no-await-in-loop
    await bot.sendDocument(chatId, file.file_id, { caption });
  }

  await bot.sendMessage(chatId, 'That\'s all the study materials currently available.', {
    reply_markup: keyboards.backToMenu(),
  });
}

module.exports = materialsCommand;
