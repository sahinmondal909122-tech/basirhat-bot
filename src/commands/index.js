/**
 * commands/index.js
 * Registers all /command handlers on the bot instance, wrapped with
 * rate limiting, maintenance mode checks, and centralized error handling.
 */

'use strict';

const { safeHandler } = require('../middleware/errorHandler');
const { enforceRateLimit } = require('../middleware/rateLimiter');
const { blockIfMaintenance } = require('../middleware/maintenanceMode');
const userService = require('../services/userService');
const { logActivity } = require('../logger');

const startCommand = require('./start');
const helpCommand = require('./help');
const aboutCommand = require('./about');
const contactCommand = require('./contact');
const noticesCommand = require('./notices');
const routineCommand = require('./routine');
const resultsCommand = require('./results');
const syllabusCommand = require('./syllabus');
const groupsCommand = require('./groups');
const websiteCommand = require('./website');
const searchCommand = require('./search');
const latestCommand = require('./latest');
const materialsCommand = require('./materials');
const { registerAdminCommands } = require('../admin');

/**
 * Wraps a plain command handler with the standard guard pipeline:
 * auto-save user -> maintenance check -> rate limit -> execute -> log.
 */
function withGuards(fn, commandName) {
  return safeHandler(async (bot, msg, ...args) => {
    userService.upsertUser(msg.from);

    if (await blockIfMaintenance(bot, msg.chat.id, msg.from.id)) return;
    if (await enforceRateLimit(bot, msg.chat.id, msg.from.id)) return;

    logActivity('COMMAND', { command: commandName, telegram_id: msg.from.id });
    await fn(bot, msg, ...args);
  }, commandName);
}

/**
 * Registers all bot commands (including admin commands) with node-telegram-bot-api.
 * @param {import('node-telegram-bot-api')} bot
 */
function registerCommands(bot) {
  bot.onText(/^\/start$/, withGuards(startCommand, '/start'));
  bot.onText(/^\/help$/, withGuards(helpCommand, '/help'));
  bot.onText(/^\/about$/, withGuards(aboutCommand, '/about'));
  bot.onText(/^\/contact$/, withGuards(contactCommand, '/contact'));
  bot.onText(/^\/notices$/, withGuards(noticesCommand, '/notices'));
  bot.onText(/^\/routine$/, withGuards(routineCommand, '/routine'));
  bot.onText(/^\/results$/, withGuards(resultsCommand, '/results'));
  bot.onText(/^\/syllabus$/, withGuards(syllabusCommand, '/syllabus'));
  bot.onText(/^\/groups$/, withGuards(groupsCommand, '/groups'));
  bot.onText(/^\/website$/, withGuards(websiteCommand, '/website'));
  bot.onText(/^\/materials$/, withGuards(materialsCommand, '/materials'));
  bot.onText(/^\/latest$/, withGuards(latestCommand, '/latest'));

  bot.onText(/^\/search(?:\s+(.+))?$/, (msg, match) => {
    const args = match && match[1] ? match[1].split(/\s+/) : [];
    return withGuards((b, m) => searchCommand(b, m, args), '/search')(bot, msg);
  });

  // Register the full admin command/panel surface (broadcast, uploads, stats, etc.)
  registerAdminCommands(bot);

  // Configure the Telegram command menu (visible via the "/" button in clients)
  bot
    .setMyCommands([
      { command: 'start', description: 'Show welcome message and main menu' },
      { command: 'help', description: 'List all available commands' },
      { command: 'about', description: 'About this bot and college' },
      { command: 'contact', description: 'Get admin contact details' },
      { command: 'notices', description: 'View latest notices' },
      { command: 'routine', description: 'Get class routine' },
      { command: 'results', description: 'Get exam results' },
      { command: 'syllabus', description: 'Get syllabus' },
      { command: 'groups', description: 'Get WhatsApp group links' },
      { command: 'website', description: 'Official college website' },
      { command: 'search', description: 'Search notices by keyword' },
      { command: 'latest', description: 'Show the most recent notice' },
    ])
    .catch(() => {
      // Non-fatal if this fails (e.g. transient network issue on startup)
    });
}

module.exports = { registerCommands };
