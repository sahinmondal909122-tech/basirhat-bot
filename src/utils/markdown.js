/**
 * markdown.js
 * Utilities to safely escape user-provided or dynamic text before sending
 * it to Telegram with Markdown parse modes, preventing formatting breakage
 * or injection of unintended markup.
 */

'use strict';

/**
 * Escapes special characters for Telegram's legacy "Markdown" parse mode.
 * Legacy Markdown only needs a small set of characters escaped.
 * @param {string} text
 * @returns {string}
 */
function escapeMarkdown(text) {
  if (text === null || text === undefined) return '';
  return String(text).replace(/([_*[\]`])/g, '\\$1');
}

/**
 * Escapes special characters for Telegram's "MarkdownV2" parse mode, which
 * requires escaping a much larger set of reserved characters.
 * @param {string} text
 * @returns {string}
 */
function escapeMarkdownV2(text) {
  if (text === null || text === undefined) return '';
  return String(text).replace(/([_*[\]()~`>#+\-=|{}.!\\])/g, '\\$1');
}

/**
 * Strips any Markdown formatting characters entirely, useful when embedding
 * arbitrary user input inside otherwise-formatted messages without escaping
 * every character individually.
 * @param {string} text
 * @returns {string}
 */
function stripMarkdown(text) {
  if (text === null || text === undefined) return '';
  return String(text).replace(/[*_`[\]()~>#+\-=|{}.!\\]/g, '');
}

/**
 * Truncates text to a maximum length, appending an ellipsis if cut short.
 * Useful for keeping broadcast previews and notice snippets within limits.
 */
function truncate(text, maxLength = 200) {
  if (!text) return '';
  const str = String(text);
  return str.length > maxLength ? `${str.slice(0, maxLength - 1)}…` : str;
}

module.exports = { escapeMarkdown, escapeMarkdownV2, stripMarkdown, truncate };
