/**
 * admin/maintenance.js
 * Allows admins to toggle maintenance mode, which blocks regular users
 * from using the bot while allowing admins full access.
 */

'use strict';

const keyboards = require('../utils/keyboards');
const { isMaintenanceModeOn, setMaintenanceMode } = require('../middleware/maintenanceMode');
const { logActivity } = require('../logger');

async function handleCallback(bot, query) {
  const data = query.data;
  const chatId = query.message.chat.id;
  const messageId = query.message.message_id;

  if (data === 'admin_maintenance') {
    const currentlyOn = isMaintenanceModeOn();
    await bot.editMessageText(
      `🛠️ *Maintenance Mode*\n\nCurrent status: ${currentlyOn ? '🔴 ON' : '🟢 OFF'}\n\nWhen enabled, only admins can use the bot; all other users see a maintenance notice.`,
      { chat_id: chatId, message_id: messageId, parse_mode: 'Markdown', reply_markup: keyboards.maintenanceMenu(currentlyOn) }
    );
    return;
  }

  if (data === 'toggle_maintenance') {
    const newState = setMaintenanceMode(!isMaintenanceModeOn());
    logActivity('MAINTENANCE_TOGGLE', { telegram_id: query.from.id, enabled: newState });
    await bot.editMessageText(
      `🛠️ *Maintenance Mode*\n\nCurrent status: ${newState ? '🔴 ON' : '🟢 OFF'}\n\nWhen enabled, only admins can use the bot; all other users see a maintenance notice.`,
      { chat_id: chatId, message_id: messageId, parse_mode: 'Markdown', reply_markup: keyboards.maintenanceMenu(newState) }
    );
    return;
  }
}

module.exports = { handleCallback };
