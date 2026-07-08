/**
 * fileHelper.js
 * Helpers for identifying and describing files coming from Telegram messages
 * (document/photo/video/audio) so upload/broadcast handlers can treat them uniformly.
 */

'use strict';

const { ALLOWED_FILE_TYPES } = require('./validators');

/**
 * Extracts a normalized descriptor from a Telegram message containing media.
 * Returns null if the message has no supported media.
 * @param {import('node-telegram-bot-api').Message} msg
 */
function extractFileFromMessage(msg) {
  if (msg.document) {
    const ext = (msg.document.file_name || '').split('.').pop().toLowerCase();
    return {
      fileId: msg.document.file_id,
      fileUniqueId: msg.document.file_unique_id,
      fileName: msg.document.file_name || `document.${ext || 'bin'}`,
      fileType: ext && ALLOWED_FILE_TYPES.includes(ext) ? ext : 'document',
      fileSize: msg.document.file_size || 0,
      telegramType: 'document',
    };
  }

  if (msg.photo && msg.photo.length > 0) {
    const largest = msg.photo[msg.photo.length - 1];
    return {
      fileId: largest.file_id,
      fileUniqueId: largest.file_unique_id,
      fileName: `photo_${Date.now()}.jpg`,
      fileType: 'jpeg',
      fileSize: largest.file_size || 0,
      telegramType: 'photo',
    };
  }

  if (msg.video) {
    return {
      fileId: msg.video.file_id,
      fileUniqueId: msg.video.file_unique_id,
      fileName: msg.video.file_name || `video_${Date.now()}.mp4`,
      fileType: 'mp4',
      fileSize: msg.video.file_size || 0,
      telegramType: 'video',
    };
  }

  if (msg.audio || msg.voice) {
    const audio = msg.audio || msg.voice;
    return {
      fileId: audio.file_id,
      fileUniqueId: audio.file_unique_id,
      fileName: audio.file_name || `audio_${Date.now()}.ogg`,
      fileType: 'audio',
      fileSize: audio.file_size || 0,
      telegramType: msg.audio ? 'audio' : 'voice',
    };
  }

  return null;
}

/** Formats a byte count into a human readable string. */
function formatFileSize(bytes) {
  if (!bytes || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / 1024 ** i).toFixed(2)} ${units[i]}`;
}

/** Checks a file size (in bytes) against the configured maximum in config. */
function isWithinSizeLimit(bytes, maxSizeMb) {
  return bytes <= maxSizeMb * 1024 * 1024;
}

module.exports = { extractFileFromMessage, formatFileSize, isWithinSizeLimit };
