/**
 * rateLimiter.js
 * Simple sliding-window rate limiter applied per Telegram user to prevent
 * spam/abuse of bot commands. This is separate from the Express HTTP rate
 * limiter (used for the health-check/webhook server).
 */

'use strict';

const config = require('../config');
const { logger } = require('../logger');

const hits = new Map(); // telegramId -> array of timestamps

/**
 * Checks whether a user is currently within their allowed request rate.
 * @param {number} telegramId
 * @returns {boolean} true if allowed, false if rate-limited
 */
function isAllowed(telegramId) {
  const now = Date.now();
  const windowStart = now - config.rateLimit.windowMs;
  const timestamps = (hits.get(telegramId) || []).filter((t) => t > windowStart);

  if (timestamps.length >= config.rateLimit.maxRequests) {
    hits.set(telegramId, timestamps);
    return false;
  }

  timestamps.push(now);
  hits.set(telegramId, timestamps);
  return true;
}

/** Periodically clears stale entries to bound memory usage. */
function startCleanupInterval() {
  setInterval(() => {
    const now = Date.now();
    const windowStart = now - config.rateLimit.windowMs;
    for (const [id, timestamps] of hits.entries()) {
      const fresh = timestamps.filter((t) => t > windowStart);
      if (fresh.length === 0) {
        hits.delete(id);
      } else {
        hits.set(id, fresh);
      }
    }
  }, 60 * 1000).unref();
}

/**
 * Express-style guard for use in bot message handlers.
 * Returns true (and optionally warns the user) if the action should be blocked.
 * @param {import('node-telegram-bot-api')} bot
 * @param {number} chatId
 * @param {number} telegramId
 */
async function enforceRateLimit(bot, chatId, telegramId) {
  if (isAllowed(telegramId)) return false;
  logger.warn(`Rate limit triggered for user ${telegramId}`);
  try {
    await bot.sendMessage(chatId, '⚠️ You are sending requests too quickly. Please wait a few seconds and try again.');
  } catch (err) {
    // ignore send failures here
  }
  return true;
}

module.exports = { isAllowed, enforceRateLimit, startCleanupInterval };
