/**
 * handlers/messageHandler.js
 * Handles all incoming messages that are not slash commands: routes active
 * admin session flows (broadcast/notice/upload composing), logs messages
 * for analytics, and provides a fallback response for unrecognized text.
 */

'use strict';

const { logger, logActivity } = require('../logger');
const userService = require('../services/userService');
const { getDb } = require('../database');
const { blockIfMaintenance } = require('../middleware/maintenanceMode');
const { enforceRateLimit } = require('../middleware/rateLimiter');
const { handleAdminSessionMessage } = require('../admin');
const keyboards = require('../utils/keyboards');

/** Persists an inbound message to the messages table for analytics/support. */
function logInboundMessage(msg) {
  const db = getDb();
  let messageType = 'text';
  if (msg.document) messageType = 'document';
  else if (msg.photo) messageType = 'photo';
  else if (msg.video) messageType = 'video';
  else if (msg.audio || msg.voice) messageType = 'audio';
  else if (msg.text && msg.text.startsWith('/')) messageType = 'command';

  db.run(
    `INSERT INTO messages (telegram_id, chat_id, message_type, content) VALUES (?, ?, ?, ?)`,
    [msg.from.id, msg.chat.id, messageType, msg.text || msg.caption || null]
  );
}

/**
 * Main entrypoint for the bot's generic "message" event.
 * @param {import('node-telegram-bot-api')} bot
 * @param {import('node-telegram-bot-api').Message} msg
 */
async function handleMessage(bot, msg) {
  try {
    if (!msg.from || msg.from.is_bot) return; // ignore other bots / channel posts without a user

    userService.upsertUser(msg.from);
    logInboundMessage(msg);

    // Slash commands are handled separately via bot.onText; skip them here
    // EXCEPT when a text message is expected as part of an active admin session
    // (session flows may legitimately want to capture text even if it looks like a command).
    const isSlashCommand = msg.text && msg.text.startsWith('/') && !msg.text.startsWith('//');

    // Let any in-progress admin session (broadcast composing, notice creation, uploads) consume this message first.
    const consumedByAdminFlow = await handleAdminSessionMessage(bot, msg);
    if (consumedByAdminFlow) return;

    if (isSlashCommand) return; // no matching admin session and it's a command -> let onText/unknown-command logic handle it

    if (await blockIfMaintenance(bot, msg.chat.id, msg.from.id)) return;
    if (await enforceRateLimit(bot, msg.chat.id, msg.from.id)) return;

    // Plain text with no active session: provide a helpful fallback nudging toward the menu.
    if (msg.text) {
      logActivity('MESSAGE', { telegram_id: msg.from.id, type: 'text' });
      await bot.sendMessage(
        msg.chat.id,
        "🤔 I didn't quite understand that. Please use the menu below or type /help to see available commands.",
        { reply_markup: keyboards.mainMenu() }
      );
    }
  } catch (err) {
    logger.error(`Error in message handler: ${err.message}`, { stack: err.stack });
  }
}

module.exports = { handleMessage };
