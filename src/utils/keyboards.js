/**
 * keyboards.js
 * Centralized definitions of all inline and reply keyboards used across the bot,
 * so button layouts stay consistent and easy to update in one place.
 */

'use strict';

/** Main menu inline keyboard shown after /start and via "Main Menu" callbacks. */
function mainMenu() {
  return {
    inline_keyboard: [
      [
        { text: '📢 Latest Notice', callback_data: 'menu_notices' },
        { text: '📅 Class Routine', callback_data: 'menu_routine' },
      ],
      [
        { text: '📚 Study Materials', callback_data: 'menu_materials' },
        { text: '📝 Results', callback_data: 'menu_results' },
      ],
      [
        { text: '📄 Syllabus', callback_data: 'menu_syllabus' },
        { text: '👥 WhatsApp Groups', callback_data: 'menu_groups' },
      ],
      [
        { text: '🌐 College Website', callback_data: 'menu_website' },
        { text: '❓ Help', callback_data: 'menu_help' },
      ],
      [{ text: '📞 Contact Admin', callback_data: 'menu_contact' }],
    ],
  };
}

/** Generic "back to main menu" button, appended under detail views. */
function backToMenu() {
  return {
    inline_keyboard: [[{ text: '⬅️ Back to Main Menu', callback_data: 'menu_main' }]],
  };
}

/** Admin panel root menu. */
function adminMenu() {
  return {
    inline_keyboard: [
      [
        { text: '📢 Broadcast', callback_data: 'admin_broadcast' },
        { text: '📝 Manage Notices', callback_data: 'admin_notices' },
      ],
      [
        { text: '📤 Upload Content', callback_data: 'admin_uploads' },
        { text: '🔗 Manage Links', callback_data: 'admin_links' },
      ],
      [
        { text: '📊 Statistics', callback_data: 'admin_stats' },
        { text: '💾 Backup & Export', callback_data: 'admin_backup' },
      ],
      [
        { text: '🛠️ Maintenance Mode', callback_data: 'admin_maintenance' },
        { text: '🔄 Restart Bot', callback_data: 'admin_restart' },
      ],
    ],
  };
}

/** Broadcast submenu. */
function broadcastMenu() {
  return {
    inline_keyboard: [
      [
        { text: '📝 Text Message', callback_data: 'bc_text' },
        { text: '🖼️ Photo', callback_data: 'bc_photo' },
      ],
      [
        { text: '📄 PDF', callback_data: 'bc_pdf' },
        { text: '🎥 Video', callback_data: 'bc_video' },
      ],
      [{ text: '⏰ Schedule Broadcast', callback_data: 'bc_schedule' }],
      [{ text: '🔁 Retry Last Failed', callback_data: 'bc_retry_last' }],
      [{ text: '⬅️ Back to Admin Menu', callback_data: 'admin_main' }],
    ],
  };
}

/** Notice management submenu. */
function noticeManageMenu() {
  return {
    inline_keyboard: [
      [{ text: '➕ Create Notice', callback_data: 'notice_create' }],
      [
        { text: '✏️ Edit Notice', callback_data: 'notice_edit' },
        { text: '🗑️ Delete Notice', callback_data: 'notice_delete' },
      ],
      [
        { text: '📌 Pin Notice', callback_data: 'notice_pin' },
        { text: '📋 List Notices', callback_data: 'notice_list' },
      ],
      [{ text: '⬅️ Back to Admin Menu', callback_data: 'admin_main' }],
    ],
  };
}

/** Upload content submenu. */
function uploadMenu() {
  return {
    inline_keyboard: [
      [{ text: '📅 Upload Routine', callback_data: 'upload_routine' }],
      [{ text: '📚 Upload Study Material', callback_data: 'upload_material' }],
      [{ text: '📝 Upload Result', callback_data: 'upload_result' }],
      [{ text: '📄 Upload Syllabus', callback_data: 'upload_syllabus' }],
      [{ text: '⬅️ Back to Admin Menu', callback_data: 'admin_main' }],
    ],
  };
}

/** Confirmation keyboard (Yes/No) with a custom callback prefix and payload id. */
function confirmKeyboard(action, id) {
  return {
    inline_keyboard: [
      [
        { text: '✅ Confirm', callback_data: `confirm_${action}_${id}` },
        { text: '❌ Cancel', callback_data: `cancel_${action}` },
      ],
    ],
  };
}

/** Maintenance mode toggle keyboard. */
function maintenanceMenu(currentlyOn) {
  return {
    inline_keyboard: [
      [
        {
          text: currentlyOn ? '🟢 Turn OFF Maintenance' : '🔴 Turn ON Maintenance',
          callback_data: 'toggle_maintenance',
        },
      ],
      [{ text: '⬅️ Back to Admin Menu', callback_data: 'admin_main' }],
    ],
  };
}

/** Pagination keyboard for lists (notices, files, etc.). */
function paginationKeyboard(prefix, currentPage, totalPages) {
  const row = [];
  if (currentPage > 1) row.push({ text: '⬅️ Prev', callback_data: `${prefix}_page_${currentPage - 1}` });
  row.push({ text: `${currentPage}/${totalPages}`, callback_data: 'noop' });
  if (currentPage < totalPages) row.push({ text: 'Next ➡️', callback_data: `${prefix}_page_${currentPage + 1}` });
  return { inline_keyboard: [row, [{ text: '⬅️ Back to Main Menu', callback_data: 'menu_main' }]] };
}

module.exports = {
  mainMenu,
  backToMenu,
  adminMenu,
  broadcastMenu,
  noticeManageMenu,
  uploadMenu,
  confirmKeyboard,
  maintenanceMenu,
  paginationKeyboard,
};
