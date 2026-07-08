/**
 * admin/uploads.js
 * Implements content upload flows: class routines, study materials,
 * results, and syllabus documents. Each flow collects metadata via text
 * then expects the file in a follow-up message.
 */

'use strict';

const keyboards = require('../utils/keyboards');
const sessionManager = require('../utils/sessionManager');
const fileService = require('../services/fileService');
const { extractFileFromMessage, isWithinSizeLimit, formatFileSize } = require('../utils/fileHelper');
const config = require('../config');
const { logActivity } = require('../logger');

async function handleCallback(bot, query) {
  const data = query.data;
  const chatId = query.message.chat.id;
  const telegramId = query.from.id;
  const messageId = query.message.message_id;

  if (data === 'admin_uploads') {
    await bot.editMessageText('📤 *Upload Content*\n\nChoose what type of content to upload:', {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'Markdown',
      reply_markup: keyboards.uploadMenu(),
    });
    return;
  }

  if (data === 'upload_routine') {
    sessionManager.setSession(telegramId, { module: 'uploads', step: 'routine_meta' });
    await bot.editMessageText(
      '📅 *Upload Class Routine*\n\nSend the department and semester in the format:\n`Department, Semester`\n\nExample: `BA English, 3rd`',
      { chat_id: chatId, message_id: messageId, parse_mode: 'Markdown' }
    );
    return;
  }

  if (data === 'upload_material') {
    sessionManager.setSession(telegramId, { module: 'uploads', step: 'material_meta' });
    await bot.editMessageText(
      '📚 *Upload Study Material*\n\nSend the subject or department name this material belongs to.\n\nExample: `Physics - Semester 2`',
      { chat_id: chatId, message_id: messageId, parse_mode: 'Markdown' }
    );
    return;
  }

  if (data === 'upload_result') {
    sessionManager.setSession(telegramId, { module: 'uploads', step: 'result_meta' });
    await bot.editMessageText(
      '📝 *Upload Result*\n\nSend the exam name, department and semester in the format:\n`Exam Name, Department, Semester`\n\nExample: `Semester Final 2026, BSc Physics, 4th`',
      { chat_id: chatId, message_id: messageId, parse_mode: 'Markdown' }
    );
    return;
  }

  if (data === 'upload_syllabus') {
    sessionManager.setSession(telegramId, { module: 'uploads', step: 'syllabus_meta' });
    await bot.editMessageText(
      '📄 *Upload Syllabus*\n\nSend the department and semester in the format:\n`Department, Semester`\n\nExample: `BCom Honours, 5th`',
      { chat_id: chatId, message_id: messageId, parse_mode: 'Markdown' }
    );
    return;
  }
}

/** Validates and stores the uploaded file, common to all upload flows. */
function validateIncomingFile(msg) {
  const file = extractFileFromMessage(msg);
  if (!file) return { error: 'Please send a valid file (PDF, DOCX, ZIP, image, video, or audio).' };
  if (!isWithinSizeLimit(file.fileSize, config.upload.maxFileSizeMb)) {
    return { error: `File too large. Maximum allowed size is ${config.upload.maxFileSizeMb}MB.` };
  }
  return { file };
}

async function handleSessionMessage(bot, msg, session) {
  const chatId = msg.chat.id;
  const telegramId = msg.from.id;
  const text = (msg.text || '').trim();

  switch (session.step) {
    case 'routine_meta': {
      const parts = text.split(',').map((p) => p.trim());
      if (parts.length < 2 || !parts[0] || !parts[1]) {
        await bot.sendMessage(chatId, '⚠️ Please use the format: `Department, Semester`', { parse_mode: 'Markdown' });
        return true;
      }
      sessionManager.setSession(telegramId, {
        module: 'uploads',
        step: 'routine_file',
        department: parts[0],
        semester: parts[1],
      });
      await bot.sendMessage(chatId, '📎 Now send the routine file (PDF/DOCX/image).');
      return true;
    }

    case 'routine_file': {
      const { file, error } = validateIncomingFile(msg);
      if (error) {
        await bot.sendMessage(chatId, `⚠️ ${error}`);
        return true;
      }
      fileService.addRoutine({
        department: session.department,
        semester: session.semester,
        fileId: file.fileId,
        fileName: file.fileName,
        uploadedBy: telegramId,
      });
      sessionManager.clearSession(telegramId);
      logActivity('UPLOAD', { category: 'routine', telegram_id: telegramId, fileName: file.fileName });
      await bot.sendMessage(
        chatId,
        `✅ Routine uploaded for *${session.department}* (Semester ${session.semester}).\n💾 Size: ${formatFileSize(file.fileSize)}`,
        { parse_mode: 'Markdown', reply_markup: keyboards.uploadMenu() }
      );
      return true;
    }

    case 'material_meta': {
      if (!text || text.length < 2) {
        await bot.sendMessage(chatId, '⚠️ Please provide a valid subject/department name.');
        return true;
      }
      sessionManager.setSession(telegramId, { module: 'uploads', step: 'material_file', subject: text });
      await bot.sendMessage(chatId, '📎 Now send the study material file.');
      return true;
    }

    case 'material_file': {
      const { file, error } = validateIncomingFile(msg);
      if (error) {
        await bot.sendMessage(chatId, `⚠️ ${error}`);
        return true;
      }
      fileService.registerFile({
        fileId: file.fileId,
        fileUniqueId: file.fileUniqueId,
        fileName: file.fileName,
        fileType: file.fileType,
        category: 'material',
        subjectOrDept: session.subject,
        uploadedBy: telegramId,
      });
      sessionManager.clearSession(telegramId);
      logActivity('UPLOAD', { category: 'material', telegram_id: telegramId, fileName: file.fileName });
      await bot.sendMessage(chatId, `✅ Study material uploaded for *${session.subject}*.`, {
        parse_mode: 'Markdown',
        reply_markup: keyboards.uploadMenu(),
      });
      return true;
    }

    case 'result_meta': {
      const parts = text.split(',').map((p) => p.trim());
      if (parts.length < 1 || !parts[0]) {
        await bot.sendMessage(chatId, '⚠️ Please use the format: `Exam Name, Department, Semester`', { parse_mode: 'Markdown' });
        return true;
      }
      sessionManager.setSession(telegramId, {
        module: 'uploads',
        step: 'result_file',
        examName: parts[0],
        department: parts[1] || null,
        semester: parts[2] || null,
      });
      await bot.sendMessage(chatId, '📎 Now send the result file (PDF).');
      return true;
    }

    case 'result_file': {
      const { file, error } = validateIncomingFile(msg);
      if (error) {
        await bot.sendMessage(chatId, `⚠️ ${error}`);
        return true;
      }
      fileService.addResult({
        examName: session.examName,
        department: session.department,
        semester: session.semester,
        fileId: file.fileId,
        fileName: file.fileName,
        uploadedBy: telegramId,
      });
      sessionManager.clearSession(telegramId);
      logActivity('UPLOAD', { category: 'result', telegram_id: telegramId, fileName: file.fileName });
      await bot.sendMessage(chatId, `✅ Result uploaded: *${session.examName}*.`, {
        parse_mode: 'Markdown',
        reply_markup: keyboards.uploadMenu(),
      });
      return true;
    }

    case 'syllabus_meta': {
      const parts = text.split(',').map((p) => p.trim());
      if (parts.length < 1 || !parts[0]) {
        await bot.sendMessage(chatId, '⚠️ Please use the format: `Department, Semester`', { parse_mode: 'Markdown' });
        return true;
      }
      sessionManager.setSession(telegramId, {
        module: 'uploads',
        step: 'syllabus_file',
        department: parts[0],
        semester: parts[1] || null,
      });
      await bot.sendMessage(chatId, '📎 Now send the syllabus file (PDF/DOCX).');
      return true;
    }

    case 'syllabus_file': {
      const { file, error } = validateIncomingFile(msg);
      if (error) {
        await bot.sendMessage(chatId, `⚠️ ${error}`);
        return true;
      }
      fileService.addSyllabus({
        department: session.department,
        semester: session.semester,
        fileId: file.fileId,
        fileName: file.fileName,
        uploadedBy: telegramId,
      });
      sessionManager.clearSession(telegramId);
      logActivity('UPLOAD', { category: 'syllabus', telegram_id: telegramId, fileName: file.fileName });
      await bot.sendMessage(chatId, `✅ Syllabus uploaded for *${session.department}*.`, {
        parse_mode: 'Markdown',
        reply_markup: keyboards.uploadMenu(),
      });
      return true;
    }

    default:
      return false;
  }
}

module.exports = { handleCallback, handleSessionMessage };
