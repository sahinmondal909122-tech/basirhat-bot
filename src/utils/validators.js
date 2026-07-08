/**
 * validators.js
 * Input validation helpers used throughout commands/handlers/admin modules
 * to reject malformed or unsafe input before it reaches the database or
 * gets sent back to Telegram.
 */

'use strict';

const ALLOWED_FILE_TYPES = ['pdf', 'docx', 'zip', 'png', 'jpeg', 'jpg', 'mp4', 'mp3', 'ogg', 'm4a', 'wav'];

/** Validates that a search keyword is safe and reasonably sized. */
function isValidSearchKeyword(keyword) {
  if (typeof keyword !== 'string') return false;
  const trimmed = keyword.trim();
  return trimmed.length >= 2 && trimmed.length <= 100;
}

/** Validates notice title length. */
function isValidNoticeTitle(title) {
  return typeof title === 'string' && title.trim().length >= 3 && title.trim().length <= 200;
}

/** Validates notice content length. */
function isValidNoticeContent(content) {
  return typeof content === 'string' && content.trim().length >= 3 && content.trim().length <= 4000;
}

/** Validates broadcast text message length (Telegram hard limit is 4096 chars). */
function isValidBroadcastText(text) {
  return typeof text === 'string' && text.trim().length >= 1 && text.trim().length <= 4000;
}

/** Validates a numeric Telegram ID. */
function isValidTelegramId(id) {
  const num = Number(id);
  return Number.isInteger(num) && num > 0;
}

/** Validates that a file's extension is in the supported list. */
function isAllowedFileExtension(fileName = '') {
  const ext = fileName.split('.').pop().toLowerCase();
  return ALLOWED_FILE_TYPES.includes(ext);
}

/** Validates a URL string (used for Manage Links feature). */
function isValidUrl(url) {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * Validates a date/time string intended for scheduling broadcasts.
 * Expected format: YYYY-MM-DD HH:mm (24h), interpreted in server local time.
 * Must be a future timestamp.
 */
function isValidFutureDateTime(input) {
  const match = /^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})$/.exec(input.trim());
  if (!match) return false;
  const [, year, month, day, hour, minute] = match.map(Number);
  const date = new Date(year, month - 1, day, hour, minute);
  if (Number.isNaN(date.getTime())) return false;
  return date.getTime() > Date.now();
}

/** Sanitizes plain text input by trimming and collapsing excessive whitespace. */
function sanitizeText(text) {
  if (typeof text !== 'string') return '';
  return text.trim().replace(/\s+/g, ' ');
}

module.exports = {
  ALLOWED_FILE_TYPES,
  isValidSearchKeyword,
  isValidNoticeTitle,
  isValidNoticeContent,
  isValidBroadcastText,
  isValidTelegramId,
  isAllowedFileExtension,
  isValidUrl,
  isValidFutureDateTime,
  sanitizeText,
};
