/**
 * bot.js
 * Creates and configures the node-telegram-bot-api instance in either
 * polling or webhook mode, registers all commands/handlers, and starts
 * background schedulers (broadcast dispatch, auto-backup).
 */

'use strict';

const TelegramBot = require('node-telegram-bot-api');
const config = require('./config');
const { logger } = require('./logger');
const { registerCommands } = require('./commands');
const { registerHandlers } = require('./handlers');
const { startSchedulers } = require('./services/schedulerService');
const rateLimiter = require('./middleware/rateLimiter');
const sessionManager = require('./utils/sessionManager');

let botInstance = null;

/**
 * Initializes the Telegram bot in the configured mode and wires up all
 * commands, event handlers, and background jobs.
 * @returns {import('node-telegram-bot-api')}
 */
function createBot() {
  const usePolling = config.bot.mode !== 'webhook';

  const bot = new TelegramBot(config.bot.token, {
    polling: usePolling
      ? {
          interval: 300,
          autoStart: true,
          params: { timeout: 10 },
        }
      : false,
  });

  if (!usePolling) {
    const fullWebhookUrl = `${config.bot.webhookUrl.replace(/\/$/, '')}${config.bot.webhookPath}`;
    bot
      .setWebHook(fullWebhookUrl)
      .then(() => logger.info(`Webhook registered at ${fullWebhookUrl}`))
      .catch((err) => logger.error(`Failed to set webhook: ${err.message}`));
  } else {
    logger.info('Bot started in polling mode.');
  }

  registerCommands(bot);
  registerHandlers(bot);
  startSchedulers(bot);
  rateLimiter.startCleanupInterval();
  sessionManager.startCleanupInterval();

  botInstance = bot;
  return bot;
}

/** Returns the already-created bot instance (used by the Express webhook route). */
function getBot() {
  if (!botInstance) {
    throw new Error('Bot has not been created yet. Call createBot() first.');
  }
  return botInstance;
}

module.exports = { createBot, getBot };
