/**
 * logger.js
 * Centralized Winston logger with daily file rotation and console output.
 * Logs are separated into combined, error, and activity (commands/broadcast/uploads) streams.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const winston = require('winston');
require('winston-daily-rotate-file');
const config = require('./config');

// Ensure logs directory exists
if (!fs.existsSync(config.paths.logs)) {
  fs.mkdirSync(config.paths.logs, { recursive: true });
}

const { combine, timestamp, printf, colorize, errors, json } = winston.format;

const consoleFormat = printf(({ level, message, timestamp: ts, stack, ...meta }) => {
  const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
  return `[${ts}] ${level}: ${stack || message}${metaStr}`;
});

const errorRotateTransport = new winston.transports.DailyRotateFile({
  filename: path.join(config.paths.logs, 'error-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  level: 'error',
  maxFiles: '30d',
  maxSize: '10m',
});

const combinedRotateTransport = new winston.transports.DailyRotateFile({
  filename: path.join(config.paths.logs, 'combined-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxFiles: '30d',
  maxSize: '20m',
});

const activityRotateTransport = new winston.transports.DailyRotateFile({
  filename: path.join(config.paths.logs, 'activity-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxFiles: '30d',
  maxSize: '20m',
});

const logger = winston.createLogger({
  level: config.logLevel,
  format: combine(timestamp(), errors({ stack: true }), json()),
  transports: [errorRotateTransport, combinedRotateTransport],
  exitOnError: false,
});

if (!config.isProduction) {
  logger.add(
    new winston.transports.Console({
      format: combine(colorize(), timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), consoleFormat),
    })
  );
} else {
  // Still show basic console output in production for PM2 log capture
  logger.add(
    new winston.transports.Console({
      format: combine(timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), consoleFormat),
    })
  );
}

/**
 * Dedicated logger for activity events (commands, joins, leaves, broadcasts, uploads, downloads).
 * Kept separate from error/combined logs for easier auditing.
 */
const activityLogger = winston.createLogger({
  level: 'info',
  format: combine(timestamp(), json()),
  transports: [activityRotateTransport],
  exitOnError: false,
});

/**
 * Logs a structured activity event.
 * @param {string} type - e.g. 'COMMAND', 'USER_JOIN', 'USER_LEAVE', 'BROADCAST', 'UPLOAD', 'DOWNLOAD'
 * @param {object} data
 */
function logActivity(type, data = {}) {
  activityLogger.info(type, data);
  logger.debug(`[ACTIVITY:${type}]`, data);
}

module.exports = { logger, logActivity };
