/**
 * admin/links.js
 * Manages WhatsApp group / website / social links shown to users via /groups.
 */

'use strict';

const sessionManager = require('../utils/sessionManager');
const validators = require('../utils/validators');
const fileService = require('../services/fileService');
const keyboards = require('../utils/keyboards');

function linksMenu() {
  return {
    inline_keyboard: [
      [{ text: '➕ Add Link', callback_data: 'link_add' }],
      [{ text: '📋 List Links', callback_data: 'link_list' }],
      [{ text: '⬅️ Back to Admin Menu', callback_data: 'admin_main' }],
    ],
  };
}

async function handleCallback(bot, query) {
  const data = query.data;
  const chatId = query.message.chat.id;
  const telegramId = query.from.id;
  const messageId = query.message.message_id;

  if (data === 'admin_links') {
    await bot.editMessageText('🔗 *Manage Links*\n\nChoose an action:', {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'Markdown',
      reply_markup: linksMenu(),
    });
    return;
  }

  if (data === 'link_add') {
    sessionManager.setSession(telegramId, { module: 'links', step: 'awaiting_link' });
    await bot.editMessageText(
      '➕ *Add Link*\n\nSend the link label and URL in the format:\n`Label, URL`\n\nExample: `1st Year WhatsApp Group, https://chat.whatsapp.com/xxxxx`',
      { chat_id: chatId, message_id: messageId, parse_mode: 'Markdown' }
    );
    return;
  }

  if (data === 'link_list') {
    const links = fileService.getActiveLinks();
    if (links.length === 0) {
      await bot.editMessageText('📭 No links added yet.', {
        chat_id: chatId,
        message_id: messageId,
        reply_markup: linksMenu(),
      });
      return;
    }
    let text = '📋 *All Links*\n\n';
    links.forEach((l) => {
      text += `#${l.id} ${l.label}\n${l.url}\n\n`;
    });
    await bot.editMessageText(text, {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'Markdown',
      reply_markup: linksMenu(),
      disable_web_page_preview: true,
    });
    return;
  }
}

async function handleSessionMessage(bot, msg, session) {
  const chatId = msg.chat.id;
  const telegramId = msg.from.id;
  const text = (msg.text || '').trim();

  if (session.step === 'awaiting_link') {
    const commaIndex = text.indexOf(',');
    if (commaIndex === -1) {
      await bot.sendMessage(chatId, '⚠️ Please use the format: `Label, URL`', { parse_mode: 'Markdown' });
      return true;
    }
    const label = text.slice(0, commaIndex).trim();
    const url = text.slice(commaIndex + 1).trim();

    if (!label || !validators.isValidUrl(url)) {
      await bot.sendMessage(chatId, '⚠️ Invalid label or URL. Please try again with a valid http(s) link.');
      return true;
    }

    fileService.addLink({ label, url, category: 'group' });
    sessionManager.clearSession(telegramId);
    await bot.sendMessage(chatId, `✅ Link "*${label}*" added successfully.`, {
      parse_mode: 'Markdown',
      reply_markup: keyboards.adminMenu(),
    });
    return true;
  }

  return false;
}

module.exports = { handleCallback, handleSessionMessage };
