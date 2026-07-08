/**
 * commands/start.js
 * Handles /start - registers the user (auto save) and shows the welcome
 * message with the main menu inline keyboard.
 */

'use strict';

const userService = require('../services/userService');
const keyboards = require('../utils/keyboards');
const config = require('../config');
const { logActivity } = require('../logger');

async function startCommand(bot, msg) {
  const chatId = msg.chat.id;
  const { isNew } = userService.upsertUser(msg.from);
  logActivity('COMMAND', { command: '/start', telegram_id: msg.from.id });

  const greetingName = msg.from.first_name || 'there';
  const welcomeText =
    `👋 Hello *${greetingName}*, welcome to the *${config.college.name} Updates Bot*!\n\n` +
    `${isNew ? '🎉 Thanks for joining us! ' : '👋 Welcome back! '}` +
    `I can help you stay updated with the latest notices, class routines, results, syllabus, study materials and more — all in one place.\n\n` +
    `Use the menu below to get started, or type /help to see all available commands.`;

  await bot.sendMessage(chatId, welcomeText, {
    parse_mode: 'Markdown',
    reply_markup: keyboards.mainMenu(),
  });
}

module.exports = startCommand;
