/**
 * admin/notices.js
 * Implements notice management: create, edit, delete, pin, and list,
 * using session-based multi-step conversation flows.
 */

'use strict';

const keyboards = require('../utils/keyboards');
const sessionManager = require('../utils/sessionManager');
const validators = require('../utils/validators');
const noticeService = require('../services/noticeService');
const { extractFileFromMessage } = require('../utils/fileHelper');
const { truncate } = require('../utils/markdown');

async function handleCallback(bot, query) {
  const data = query.data;
  const chatId = query.message.chat.id;
  const telegramId = query.from.id;
  const messageId = query.message.message_id;

  if (data === 'admin_notices') {
    await bot.editMessageText('📝 *Notice Management*\n\nChoose an action:', {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'Markdown',
      reply_markup: keyboards.noticeManageMenu(),
    });
    return;
  }

  if (data === 'notice_create') {
    sessionManager.setSession(telegramId, { module: 'notices', step: 'awaiting_title' });
    await bot.editMessageText('➕ *Create Notice*\n\nSend the *title* of the notice (3-200 characters).', {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'Markdown',
    });
    return;
  }

  if (data === 'notice_edit') {
    sessionManager.setSession(telegramId, { module: 'notices', step: 'awaiting_edit_id' });
    await bot.editMessageText('✏️ *Edit Notice*\n\nSend the numeric ID of the notice to edit. Use "List Notices" to find IDs.', {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'Markdown',
    });
    return;
  }

  if (data === 'notice_delete') {
    sessionManager.setSession(telegramId, { module: 'notices', step: 'awaiting_delete_id' });
    await bot.editMessageText('🗑️ *Delete Notice*\n\nSend the numeric ID of the notice to delete.', {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'Markdown',
    });
    return;
  }

  if (data === 'notice_pin') {
    sessionManager.setSession(telegramId, { module: 'notices', step: 'awaiting_pin_id' });
    await bot.editMessageText('📌 *Pin Notice*\n\nSend the numeric ID of the notice to pin to the top.', {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'Markdown',
    });
    return;
  }

  if (data === 'notice_list') {
    const list = noticeService.getLatestNotices(20);
    if (list.length === 0) {
      await bot.editMessageText('📭 No notices exist yet.', {
        chat_id: chatId,
        message_id: messageId,
        reply_markup: keyboards.noticeManageMenu(),
      });
      return;
    }
    let text = '📋 *All Notices*\n\n';
    list.forEach((n) => {
      text += `#${n.id} ${n.is_pinned ? '📌 ' : ''}*${n.title}*\n${truncate(n.content, 80)}\n🏷️ ${n.category}\n\n`;
    });
    await bot.editMessageText(text, {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'Markdown',
      reply_markup: keyboards.noticeManageMenu(),
    });
    return;
  }
}

async function handleConfirmDelete(bot, query, data) {
  const chatId = query.message.chat.id;
  const telegramId = query.from.id;
  const session = sessionManager.getSession(telegramId);

  if (data.startsWith('cancel_')) {
    sessionManager.clearSession(telegramId);
    await bot.answerCallbackQuery(query.id, { text: 'Cancelled.' });
    await bot.editMessageText('❌ Deletion cancelled.', { chat_id: chatId, message_id: query.message.message_id });
    return;
  }

  const noticeId = session.pendingDeleteId;
  sessionManager.clearSession(telegramId);
  const deleted = noticeService.deleteNotice(noticeId);
  await bot.answerCallbackQuery(query.id, { text: deleted ? 'Notice deleted.' : 'Notice not found.' });
  await bot.editMessageText(deleted ? `🗑️ Notice #${noticeId} deleted successfully.` : `⚠️ Notice #${noticeId} not found.`, {
    chat_id: chatId,
    message_id: query.message.message_id,
  });
}

async function handleSessionMessage(bot, msg, session) {
  const chatId = msg.chat.id;
  const telegramId = msg.from.id;
  const text = (msg.text || '').trim();

  if (session.step === 'awaiting_title') {
    if (!validators.isValidNoticeTitle(text)) {
      await bot.sendMessage(chatId, '⚠️ Title must be 3-200 characters. Please try again.');
      return true;
    }
    sessionManager.setSession(telegramId, { module: 'notices', step: 'awaiting_content', title: text });
    await bot.sendMessage(chatId, '📝 Now send the *content* of the notice (3-4000 characters). You may optionally attach a document/photo in the same message.', {
      parse_mode: 'Markdown',
    });
    return true;
  }

  if (session.step === 'awaiting_content') {
    const content = text || msg.caption || '';
    if (!validators.isValidNoticeContent(content)) {
      await bot.sendMessage(chatId, '⚠️ Content must be 3-4000 characters. Please try again.');
      return true;
    }
    const file = extractFileFromMessage(msg);
    const category = detectCategory(session.title + ' ' + content);

    const id = noticeService.createNotice({
      title: session.title,
      content,
      category,
      fileId: file ? file.fileId : null,
      fileType: file ? file.telegramType : null,
      createdBy: telegramId,
    });

    sessionManager.clearSession(telegramId);
    await bot.sendMessage(chatId, `✅ Notice #${id} created successfully under category "${category}".`, {
      reply_markup: keyboards.noticeManageMenu(),
    });
    return true;
  }

  if (session.step === 'awaiting_edit_id') {
    const id = parseInt(text, 10);
    const notice = noticeService.getNoticeById(id);
    if (!notice) {
      await bot.sendMessage(chatId, '⚠️ Notice not found. Please send a valid numeric ID.');
      return true;
    }
    sessionManager.setSession(telegramId, { module: 'notices', step: 'awaiting_edit_content', editId: id });
    await bot.sendMessage(chatId, `✏️ Current content:\n\n${notice.content}\n\nSend the *new content* for this notice.`, {
      parse_mode: 'Markdown',
    });
    return true;
  }

  if (session.step === 'awaiting_edit_content') {
    if (!validators.isValidNoticeContent(text)) {
      await bot.sendMessage(chatId, '⚠️ Content must be 3-4000 characters. Please try again.');
      return true;
    }
    const updated = noticeService.updateNotice(session.editId, { content: text });
    sessionManager.clearSession(telegramId);
    await bot.sendMessage(chatId, updated ? `✅ Notice #${session.editId} updated successfully.` : '⚠️ Update failed - notice may have been deleted.', {
      reply_markup: keyboards.noticeManageMenu(),
    });
    return true;
  }

  if (session.step === 'awaiting_delete_id') {
    const id = parseInt(text, 10);
    const notice = noticeService.getNoticeById(id);
    if (!notice) {
      await bot.sendMessage(chatId, '⚠️ Notice not found. Please send a valid numeric ID.');
      return true;
    }
    sessionManager.setSession(telegramId, {
      module: 'notices',
      step: 'awaiting_delete_confirm',
      confirmHandler: 'notice_delete',
      pendingDeleteId: id,
    });
    await bot.sendMessage(chatId, `🗑️ Are you sure you want to delete notice #${id}: "${notice.title}"?`, {
      reply_markup: keyboards.confirmKeyboard('delete', id),
    });
    return true;
  }

  if (session.step === 'awaiting_pin_id') {
    const id = parseInt(text, 10);
    const notice = noticeService.getNoticeById(id);
    if (!notice) {
      await bot.sendMessage(chatId, '⚠️ Notice not found. Please send a valid numeric ID.');
      return true;
    }
    noticeService.pinNotice(id);
    sessionManager.clearSession(telegramId);
    await bot.sendMessage(chatId, `📌 Notice #${id} pinned successfully.`, { reply_markup: keyboards.noticeManageMenu() });
    return true;
  }

  return false;
}

/** Simple keyword-based category auto-detection to help organize notices. */
function detectCategory(text) {
  const lower = text.toLowerCase();
  const map = {
    exam: 'exam',
    examination: 'exam',
    admission: 'admission',
    holiday: 'holiday',
    vacation: 'holiday',
    routine: 'routine',
    scholarship: 'scholarship',
    semester: 'semester',
    library: 'library',
  };
  for (const [keyword, category] of Object.entries(map)) {
    if (lower.includes(keyword)) return category;
  }
  return 'general';
}

module.exports = { handleCallback, handleConfirmDelete, handleSessionMessage };
