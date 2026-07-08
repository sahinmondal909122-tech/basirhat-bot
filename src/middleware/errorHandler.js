/**
 * errorHandler.js
 * Provides a wrapper for async bot handler functions so every command,
 * callback, or message handler automatically has centralized error logging
 * and a graceful fallback message to the user, without repeating try/catch
 * boilerplate in every handler.
 */

'use strict';

const { logger } = require('../logger');

/**
 * Wraps an async handler function. Any thrown error is logged and the user
 * is shown a friendly error message instead of the bot silently failing.
 * @param {Function} handlerFn - async (bot, msgOrQuery, ...args) => void
 * @param {string} label - short name for logging context
 */
function safeHandler(handlerFn, label = 'handler') {
  return async (bot, ctx, ...args) => {
    try {
      await handlerFn(bot, ctx, ...args);
    } catch (err) {
      logger.error(`Error in ${label}: ${err.message}`, { stack: err.stack });
      const chatId = ctx?.chat?.id || ctx?.message?.chat?.id;
      if (chatId) {
        try {
          await bot.sendMessage(chatId, '⚠️ Something went wrong while processing your request. Please try again in a moment.');
        } catch (sendErr) {
          logger.error(`Failed to notify user of error: ${sendErr.message}`);
        }
      }
    }
  };
}

module.exports = { safeHandler };
