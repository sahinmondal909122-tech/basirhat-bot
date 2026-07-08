/**
 * admin/broadcast.js
 * Implements the full broadcast feature: text/photo/pdf/video broadcasts,
 * scheduled broadcasts, and retry-failed delivery, using a session-based
 * multi-step conversation flow.
 */

'use strict';

const keyboards = require('../utils/keyboards');
const sessionManager = require('../utils/sessionManager');
const validators = require('../utils/validators');
const broadcastService = require('../services/broadcastService');
const userService = require('../services/userService');
const { extractFileFromMessage } = require('../utils/fileHelper');

/** Handles all bc_* and admin_broadcast callback queries. */
async function handleCallback(bot, query) {
  const data = query.data;
  const chatId = query.message.chat.id;
  const telegramId = query.from.id;
  const messageId = query.message.message_id;

  if (data === 'admin_broadcast') {
    const activeUserCount = userService.getActiveUsers().length;
    await bot.editMessageText(
      `📢 *Broadcast Center*\n\nActive recipients: ${activeUserCount}\n\nChoose what type of broadcast to send:`,
      { chat_id: chatId, message_id: messageId, parse_mode: 'Markdown', reply_markup: keyboards.broadcastMenu() }
    );
    return;
  }

  if (data === 'bc_text' || data === 'bc_photo' || data === 'bc_pdf' || data === 'bc_video') {
    const typeMap = { bc_text: 'text', bc_photo: 'photo', bc_pdf: 'pdf', bc_video: 'video' };
    const contentType = typeMap[data];
    sessionManager.setSession(telegramId, { module: 'broadcast', step: `awaiting_${contentType}`, contentType });

    const prompts = {
      text: '📝 Please send the *text message* you want to broadcast to all users.',
      photo: '🖼️ Please send the *photo* (with an optional caption) you want to broadcast.',
      pdf: '📄 Please send the *PDF document* (with an optional caption) you want to broadcast.',
      video: '🎥 Please send the *video* (with an optional caption) you want to broadcast.',
    };

    await bot.editMessageText(prompts[contentType], { chat_id: chatId, message_id: messageId, parse_mode: 'Markdown' });
    return;
  }

  if (data === 'bc_schedule') {
    sessionManager.setSession(telegramId, { module: 'broadcast', step: 'awaiting_schedule_text' });
    await bot.editMessageText(
      '⏰ *Schedule a Broadcast*\n\nFirst, send the *text message* you want scheduled.',
      { chat_id: chatId, message_id: messageId, parse_mode: 'Markdown' }
    );
    return;
  }

  if (data === 'bc_retry_last') {
    const recent = broadcastService.getRecentBroadcasts(1);
    if (recent.length === 0 || recent[0].failed_count === 0) {
      await bot.answerCallbackQuery(query.id, { text: 'No recent broadcast with failed deliveries.' });
      return;
    }
    await bot.answerCallbackQuery(query.id, { text: 'Retrying failed deliveries...' });
    await broadcastService.retryFailedBroadcast(bot, recent[0].id, chatId);
    return;
  }
}

/**
 * Sends a preview of the composed broadcast with a confirm/cancel keyboard.
 */
async function sendPreview(bot, chatId, telegramId, broadcastData) {
  sessionManager.setSession(telegramId, {
    module: 'broadcast',
    step: 'awaiting_confirmation',
    confirmHandler: 'broadcast_send',
    pending: broadcastData,
  });

  const preview = `📢 *Broadcast Preview*\n\nType: ${broadcastData.contentType}\n${
    broadcastData.content ? `\nMessage:\n${broadcastData.content}\n` : ''
  }${broadcastData.scheduledAt ? `\n⏰ Scheduled for: ${broadcastData.scheduledAt}` : '\nThis will be sent immediately.'}\n\nConfirm sending this to all active users?`;

  await bot.sendMessage(chatId, preview, {
    parse_mode: 'Markdown',
    reply_markup: keyboards.confirmKeyboard('broadcast', 'x'),
  });
}

/** Handles confirm_/cancel_ callback for a pending broadcast. */
async function handleConfirmSend(bot, query, data) {
  const chatId = query.message.chat.id;
  const telegramId = query.from.id;
  const session = sessionManager.getSession(telegramId);

  if (data.startsWith('cancel_')) {
    sessionManager.clearSession(telegramId);
    await bot.answerCallbackQuery(query.id, { text: 'Broadcast cancelled.' });
    await bot.editMessageText('❌ Broadcast cancelled.', { chat_id: chatId, message_id: query.message.message_id });
    return;
  }

  const { pending } = session;
  sessionManager.clearSession(telegramId);
  await bot.answerCallbackQuery(query.id, { text: 'Starting broadcast...' });
  await bot.editMessageText('🚀 Broadcast confirmed. Starting delivery now...', {
    chat_id: chatId,
    message_id: query.message.message_id,
  });

  const broadcastId = broadcastService.createBroadcastRecord({
    adminId: telegramId,
    contentType: pending.contentType,
    content: pending.content || null,
    fileId: pending.fileId || null,
    scheduledAt: pending.scheduledAt || null,
  });

  if (pending.scheduledAt) {
    await bot.sendMessage(chatId, `⏰ Broadcast #${broadcastId} scheduled for ${pending.scheduledAt}.`);
    return;
  }

  await broadcastService.executeBroadcast(bot, broadcastId, chatId);
}

/**
 * Processes a message that arrives while the admin has an active broadcast session.
 * Returns true if it was consumed.
 */
async function handleSessionMessage(bot, msg, session) {
  const chatId = msg.chat.id;
  const telegramId = msg.from.id;

  // --- Immediate content broadcasts ---
  if (session.step === 'awaiting_text') {
    if (!msg.text || !validators.isValidBroadcastText(msg.text)) {
      await bot.sendMessage(chatId, '⚠️ Please send a valid text message (1-4000 characters).');
      return true;
    }
    await sendPreview(bot, chatId, telegramId, { contentType: 'text', content: msg.text });
    return true;
  }

  if (['awaiting_photo', 'awaiting_pdf', 'awaiting_video'].includes(session.step)) {
    const file = extractFileFromMessage(msg);
    if (!file) {
      await bot.sendMessage(chatId, '⚠️ Please send the requested media file.');
      return true;
    }
    await sendPreview(bot, chatId, telegramId, {
      contentType: session.contentType,
      content: msg.caption || '',
      fileId: file.fileId,
    });
    return true;
  }

  // --- Scheduled broadcast flow ---
  if (session.step === 'awaiting_schedule_text') {
    if (!msg.text || !validators.isValidBroadcastText(msg.text)) {
      await bot.sendMessage(chatId, '⚠️ Please send a valid text message (1-4000 characters).');
      return true;
    }
    sessionManager.setSession(telegramId, {
      module: 'broadcast',
      step: 'awaiting_schedule_time',
      pendingText: msg.text,
    });
    await bot.sendMessage(
      chatId,
      '⏰ Now send the date and time to schedule this broadcast, in the format:\n`YYYY-MM-DD HH:mm` (24-hour, server local time)\n\nExample: `2026-07-10 09:30`',
      { parse_mode: 'Markdown' }
    );
    return true;
  }

  if (session.step === 'awaiting_schedule_time') {
    if (!msg.text || !validators.isValidFutureDateTime(msg.text)) {
      await bot.sendMessage(chatId, '⚠️ Invalid or past date/time. Please use format `YYYY-MM-DD HH:mm` and a future time.', {
        parse_mode: 'Markdown',
      });
      return true;
    }
    const scheduledAt = msg.text.trim().replace(' ', 'T') + ':00';
    await sendPreview(bot, chatId, telegramId, {
      contentType: 'text',
      content: session.pendingText,
      scheduledAt,
    });
    return true;
  }

  return false;
}

module.exports = { handleCallback, handleConfirmSend, handleSessionMessage };
