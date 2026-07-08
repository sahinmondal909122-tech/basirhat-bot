/**
 * broadcastService.js
 * Handles broadcasting messages/media to all active users with:
 *  - Live progress indicator (edits a status message periodically)
 *  - Per-user failure logging (users who blocked the bot, etc.)
 *  - Retry mechanism for failed deliveries
 *  - Scheduled broadcasts (checked by a cron job in schedulerService.js)
 *  - Throttling to respect Telegram's flood limits
 */

'use strict';

const { getDb } = require('../database');
const config = require('../config');
const { logger, logActivity } = require('../logger');
const userService = require('./userService');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Creates a broadcast record in the database.
 */
function createBroadcastRecord({ adminId, contentType, content = null, fileId = null, scheduledAt = null }) {
  const db = getDb();
  const status = scheduledAt ? 'scheduled' : 'pending';
  const result = db.run(
    `INSERT INTO broadcasts (admin_id, content_type, content, file_id, status, scheduled_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [adminId, contentType, content, fileId, status, scheduledAt]
  );
  return result.lastInsertRowid;
}

function updateBroadcastStatus(id, fields) {
  const db = getDb();
  const keys = Object.keys(fields);
  if (keys.length === 0) return;
  const setClause = keys.map((k) => `${k} = ?`).join(', ');
  const values = keys.map((k) => fields[k]);
  db.run(`UPDATE broadcasts SET ${setClause} WHERE id = ?`, [...values, id]);
}

function getDueScheduledBroadcasts() {
  const db = getDb();
  return db.all(
    `SELECT * FROM broadcasts WHERE status = 'scheduled' AND scheduled_at <= datetime('now')`
  );
}

function getBroadcastById(id) {
  const db = getDb();
  return db.get('SELECT * FROM broadcasts WHERE id = ?', [id]);
}

function getRecentBroadcasts(limit = 10) {
  const db = getDb();
  return db.all('SELECT * FROM broadcasts ORDER BY created_at DESC LIMIT ?', [limit]);
}

/**
 * Sends a single broadcast content item to one chat id, based on content_type.
 * @param {import('node-telegram-bot-api')} bot
 * @param {object} broadcast - row from broadcasts table
 * @param {number} chatId
 */
async function deliverToUser(bot, broadcast, chatId) {
  const options = { parse_mode: 'Markdown' };
  switch (broadcast.content_type) {
    case 'text':
      return bot.sendMessage(chatId, broadcast.content, options);
    case 'photo':
      return bot.sendPhoto(chatId, broadcast.file_id, { caption: broadcast.content || '', ...options });
    case 'pdf':
      return bot.sendDocument(chatId, broadcast.file_id, { caption: broadcast.content || '', ...options });
    case 'video':
      return bot.sendVideo(chatId, broadcast.file_id, { caption: broadcast.content || '', ...options });
    default:
      throw new Error(`Unsupported broadcast content_type: ${broadcast.content_type}`);
  }
}

/**
 * Executes a broadcast to all active users, editing a status message in the
 * admin's chat periodically to show live progress, and recording failures.
 * @param {import('node-telegram-bot-api')} bot
 * @param {number} broadcastId
 * @param {number} adminChatId - chat to show progress updates in
 * @param {number[]} [targetIds] - optional explicit recipient list (used for retries)
 */
async function executeBroadcast(bot, broadcastId, adminChatId, targetIds = null) {
  const broadcast = getBroadcastById(broadcastId);
  if (!broadcast) throw new Error('Broadcast not found');

  const recipients = targetIds || userService.getActiveUsers().map((u) => u.telegram_id);
  const total = recipients.length;

  updateBroadcastStatus(broadcastId, {
    status: 'in_progress',
    started_at: new Date().toISOString(),
    total_recipients: total,
  });

  let statusMsg;
  try {
    statusMsg = await bot.sendMessage(
      adminChatId,
      `📡 *Broadcast Started*\n\nTotal recipients: ${total}\nSent: 0\nFailed: 0\nProgress: 0%`,
      { parse_mode: 'Markdown' }
    );
  } catch (err) {
    logger.warn(`Could not send broadcast status message: ${err.message}`);
  }

  let success = 0;
  let failed = 0;
  const failedIds = [];
  const perMessageDelay = Math.max(1000 / config.broadcast.messagesPerSecond, 10);
  const progressUpdateEvery = Math.max(Math.floor(total / 20), 5); // ~20 updates max

  for (let i = 0; i < recipients.length; i += 1) {
    const chatId = recipients[i];
    try {
      await deliverToUser(bot, broadcast, chatId);
      success += 1;
    } catch (err) {
      failed += 1;
      failedIds.push(chatId);
      // If Telegram reports the user blocked the bot, mark them inactive.
      if (err.response && [403].includes(err.response.statusCode)) {
        userService.markUserInactive(chatId);
      }
      logger.warn(`Broadcast delivery failed for user ${chatId}: ${err.message}`);
    }

    if (statusMsg && ((i + 1) % progressUpdateEvery === 0 || i + 1 === total)) {
      const percent = Math.round(((i + 1) / total) * 100);
      try {
        await bot.editMessageText(
          `📡 *Broadcast In Progress*\n\nTotal recipients: ${total}\nSent: ${success}\nFailed: ${failed}\nProgress: ${percent}%`,
          { chat_id: adminChatId, message_id: statusMsg.message_id, parse_mode: 'Markdown' }
        );
      } catch (editErr) {
        // Ignore "message not modified" and similar non-critical errors.
      }
    }

    await sleep(perMessageDelay);
  }

  updateBroadcastStatus(broadcastId, {
    status: 'completed',
    success_count: success,
    failed_count: failed,
    failed_user_ids: JSON.stringify(failedIds),
    completed_at: new Date().toISOString(),
  });

  logActivity('BROADCAST', { broadcastId, total, success, failed });

  if (statusMsg) {
    try {
      await bot.editMessageText(
        `✅ *Broadcast Completed*\n\nTotal recipients: ${total}\n✅ Sent: ${success}\n❌ Failed: ${failed}\n\n${
          failed > 0 ? 'Use "Retry Failed" from the Broadcast menu to resend to failed users.' : 'All messages delivered successfully!'
        }`,
        { chat_id: adminChatId, message_id: statusMsg.message_id, parse_mode: 'Markdown' }
      );
    } catch (err) {
      // non-critical
    }
  }

  return { total, success, failed, failedIds };
}

/** Retries delivery only to users who previously failed for a given broadcast. */
async function retryFailedBroadcast(bot, broadcastId, adminChatId) {
  const broadcast = getBroadcastById(broadcastId);
  if (!broadcast) throw new Error('Broadcast not found');
  const failedIds = JSON.parse(broadcast.failed_user_ids || '[]');
  if (failedIds.length === 0) {
    await bot.sendMessage(adminChatId, 'ℹ️ No failed deliveries to retry for this broadcast.');
    return null;
  }
  return executeBroadcast(bot, broadcastId, adminChatId, failedIds);
}

module.exports = {
  createBroadcastRecord,
  updateBroadcastStatus,
  getDueScheduledBroadcasts,
  getBroadcastById,
  getRecentBroadcasts,
  executeBroadcast,
  retryFailedBroadcast,
};
