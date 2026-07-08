/**
 * handlers/callbackHandler.js
 * Central router for all inline keyboard callback_query events: main menu
 * navigation and delegation to the admin panel for admin-scoped actions.
 */

'use strict';

const { logger, logActivity } = require('../logger');
const keyboards = require('../utils/keyboards');
const userService = require('../services/userService');
const { blockIfMaintenance } = require('../middleware/maintenanceMode');
const { handleAdminCallback } = require('../admin');

const noticesCommand = require('../commands/notices');
const routineCommand = require('../commands/routine');
const resultsCommand = require('../commands/results');
const syllabusCommand = require('../commands/syllabus');
const groupsCommand = require('../commands/groups');
const websiteCommand = require('../commands/website');
const helpCommand = require('../commands/help');
const contactCommand = require('../commands/contact');
const materialsCommand = require('../commands/materials');

/**
 * Handles a single callback_query event end-to-end: acknowledges it to stop
 * the client-side loading spinner, then routes to the correct feature.
 * @param {import('node-telegram-bot-api')} bot
 * @param {import('node-telegram-bot-api').CallbackQuery} query
 */
async function handleCallbackQuery(bot, query) {
  const data = query.data;
  const chatId = query.message.chat.id;
  const telegramId = query.from.id;

  try {
    // Always acknowledge first so Telegram clients stop showing the loading spinner.
    await bot.answerCallbackQuery(query.id).catch(() => {});

    userService.upsertUser(query.from);

    // Admin-scoped callbacks (admin_*, bc_*, notice_*, upload_*, link_*, confirm_*, cancel_*)
    const handledByAdmin = await handleAdminCallback(bot, query);
    if (handledByAdmin) return;

    if (data === 'noop') return;

    if (await blockIfMaintenance(bot, chatId, telegramId)) return;

    logActivity('CALLBACK', { data, telegram_id: telegramId });

    const fakeMsg = { chat: query.message.chat, from: query.from };

    switch (data) {
      case 'menu_main':
        await bot.editMessageText('🏠 *Main Menu*\n\nChoose an option below:', {
          chat_id: chatId,
          message_id: query.message.message_id,
          parse_mode: 'Markdown',
          reply_markup: keyboards.mainMenu(),
        });
        break;

      case 'menu_notices':
        await noticesCommand(bot, fakeMsg);
        break;

      case 'menu_routine':
        await routineCommand(bot, fakeMsg);
        break;

      case 'menu_materials':
        await materialsCommand(bot, fakeMsg);
        break;

      case 'menu_results':
        await resultsCommand(bot, fakeMsg);
        break;

      case 'menu_syllabus':
        await syllabusCommand(bot, fakeMsg);
        break;

      case 'menu_groups':
        await groupsCommand(bot, fakeMsg);
        break;

      case 'menu_website':
        await websiteCommand(bot, fakeMsg);
        break;

      case 'menu_help':
        await helpCommand(bot, fakeMsg);
        break;

      case 'menu_contact':
        await contactCommand(bot, fakeMsg);
        break;

      default:
        logger.debug(`Unhandled callback_data: ${data}`);
    }
  } catch (err) {
    logger.error(`Error handling callback query: ${err.message}`, { stack: err.stack });
    try {
      await bot.sendMessage(chatId, '⚠️ Something went wrong. Please try again.');
    } catch (sendErr) {
      logger.error(`Failed to notify user of callback error: ${sendErr.message}`);
    }
  }
}

module.exports = { handleCallbackQuery };
