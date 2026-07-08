/**
 * handlers/index.js
 * Wires up all top-level bot event listeners: messages, callback queries,
 * and Telegram API/polling error handling with automatic reconnect logging.
 */

'use strict';

const { logger } = require('../logger');
const { handleMessage } = require('./messageHandler');
const { handleCallbackQuery } = require('./callbackHandler');

/**
 * Attaches all event listeners to the bot instance.
 * @param {import('node-telegram-bot-api')} bot
 */
function registerHandlers(bot) {
  bot.on('message', (msg) => {
    handleMessage(bot, msg).catch((err) => {
      logger.error(`Unhandled error in message handler: ${err.message}`, { stack: err.stack });
    });
  });

  bot.on('callback_query', (query) => {
    handleCallbackQuery(bot, query).catch((err) => {
      logger.error(`Unhandled error in callback handler: ${err.message}`, { stack: err.stack });
    });
  });

  // Polling errors: network hiccups, invalid token, conflict with another instance, etc.
  bot.on('polling_error', (err) => {
    logger.error(`Polling error: ${err.message}`, { code: err.code });
  });

  // Webhook errors (only relevant when BOT_MODE=webhook)
  bot.on('webhook_error', (err) => {
    logger.error(`Webhook error: ${err.message}`, { code: err.code });
  });

  logger.info('Bot event handlers registered (message, callback_query, polling_error, webhook_error).');
}

module.exports = { registerHandlers };
