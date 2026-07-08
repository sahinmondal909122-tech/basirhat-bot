/**
 * commands/search.js
 * Handles /search <keyword> - searches notices by keyword (title/content/category).
 */

'use strict';

const noticeService = require('../services/noticeService');
const validators = require('../utils/validators');
const keyboards = require('../utils/keyboards');
const { truncate } = require('../utils/markdown');

async function searchCommand(bot, msg, args) {
  const chatId = msg.chat.id;
  const keyword = (args || []).join(' ').trim();

  if (!validators.isValidSearchKeyword(keyword)) {
    await bot.sendMessage(
      chatId,
      '🔍 Please provide a keyword to search.\n\nExample: `/search exam`\n\nTry keywords like: exam, admission, holiday, routine, scholarship, semester, library.',
      { parse_mode: 'Markdown' }
    );
    return;
  }

  const results = noticeService.searchNotices(keyword, 15);

  if (results.length === 0) {
    await bot.sendMessage(chatId, `🔍 No notices found matching "*${keyword}*". Try a different keyword.`, {
      parse_mode: 'Markdown',
      reply_markup: keyboards.backToMenu(),
    });
    return;
  }

  let text = `🔍 *Search Results for "${keyword}"* (${results.length} found)\n\n`;
  results.forEach((n, idx) => {
    const date = new Date(n.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    text += `*${idx + 1}. ${n.title}*\n${truncate(n.content, 150)}\n🗓️ ${date} | 🏷️ ${n.category}\n\n`;
  });

  await bot.sendMessage(chatId, text, { parse_mode: 'Markdown', reply_markup: keyboards.backToMenu() });
}

module.exports = searchCommand;
