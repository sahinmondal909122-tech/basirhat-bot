/**
 * config.js
 * Central configuration loader. Reads and validates environment variables
 * so the rest of the application can rely on a single, typed config object.
 */

'use strict';

const path = require('path');
require('dotenv').config();

/**
 * Parses a comma separated list of numeric Telegram IDs into an array of numbers.
 * @param {string} raw
 * @returns {number[]}
 */
function parseAdminIds(raw) {
  if (!raw) return [];
  return raw
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)
    .map((id) => Number(id))
    .filter((id) => Number.isInteger(id));
}

const requiredVars = ['BOT_TOKEN'];
const missing = requiredVars.filter((key) => !process.env[key]);

if (missing.length > 0) {
  // Fail fast with a clear message instead of crashing deep in the stack later.
  // eslint-disable-next-line no-console
  console.error(`[CONFIG ERROR] Missing required environment variables: ${missing.join(', ')}`);
  console.error('Please copy .env.example to .env and fill in the values.');
  process.exit(1);
}

const config = {
  env: process.env.NODE_ENV || 'production',
  isProduction: (process.env.NODE_ENV || 'production') === 'production',

  bot: {
    token: process.env.BOT_TOKEN,
    username: process.env.BOT_USERNAME || 'basirhatcollege_updates_bot',
    mode: (process.env.BOT_MODE || 'polling').toLowerCase(), // polling | webhook
    webhookUrl: process.env.WEBHOOK_URL || '',
    webhookPath: process.env.WEBHOOK_PATH || '/telegram/webhook',
  },

  server: {
    port: parseInt(process.env.PORT, 10) || 3000,
  },

  admin: {
    ids: parseAdminIds(process.env.ADMIN_IDS),
  },

  database: {
    driver: (process.env.DATABASE || 'sqlite').toLowerCase(), // sqlite | mysql
    sqlitePath: process.env.SQLITE_PATH || path.join(__dirname, '..', 'database', 'bot.db'),
    mysql: {
      host: process.env.MYSQL_HOST || '127.0.0.1',
      port: parseInt(process.env.MYSQL_PORT, 10) || 3306,
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'basirhat_bot',
    },
  },

  paths: {
    uploads: path.join(__dirname, '..', 'uploads'),
    logs: path.join(__dirname, '..', 'logs'),
    database: path.join(__dirname, '..', 'database'),
  },

  college: {
    name: process.env.COLLEGE_NAME || 'Basirhat College',
    website: process.env.COLLEGE_WEBSITE || 'https://basirhatcollege.ac.in',
    contactPhone: process.env.COLLEGE_CONTACT_PHONE || '',
    contactEmail: process.env.COLLEGE_CONTACT_EMAIL || '',
    address: process.env.COLLEGE_ADDRESS || '',
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 10000,
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 8,
  },

  broadcast: {
    messagesPerSecond: parseInt(process.env.BROADCAST_MESSAGES_PER_SECOND, 10) || 25,
  },

  backup: {
    intervalHours: parseInt(process.env.BACKUP_INTERVAL_HOURS, 10) || 24,
  },

  upload: {
    maxFileSizeMb: parseInt(process.env.MAX_FILE_SIZE_MB, 10) || 20,
  },

  logLevel: process.env.LOG_LEVEL || 'info',
};

if (config.admin.ids.length === 0) {
  // eslint-disable-next-line no-console
  console.warn('[CONFIG WARNING] No ADMIN_IDS configured. Admin panel will be inaccessible to everyone.');
}

module.exports = config;
