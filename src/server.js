/**
 * server.js
 * Application entrypoint. Boots the Express HTTP server (health checks,
 * optional Telegram webhook endpoint) and the Telegram bot itself, with
 * global error handling and graceful shutdown.
 */

'use strict';

const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const config = require('./config');
const { logger } = require('./logger');
const { initDatabase } = require('./database');
const { createBot, getBot } = require('./bot');

// ---------------------------------------------------------------------------
// 1. Initialize database before anything else touches it.
// ---------------------------------------------------------------------------
initDatabase();

// ---------------------------------------------------------------------------
// 2. Create the Telegram bot (polling or webhook mode based on config).
// ---------------------------------------------------------------------------
const bot = createBot();

// ---------------------------------------------------------------------------
// 3. Set up the Express app (used for health checks and webhook delivery).
// ---------------------------------------------------------------------------
const app = express();

app.use(helmet());
app.use(compression());
app.use(cors());
app.use(express.json({ limit: '2mb' }));

const httpLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(httpLimiter);

// Health check endpoint (useful for Railway/Render/PM2/uptime monitors)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'basirhatcollege-updates-bot',
    mode: config.bot.mode,
    timestamp: new Date().toISOString(),
  });
});

app.get('/', (req, res) => {
  res.status(200).send('Basirhat College Updates Bot is running.');
});

// Telegram webhook endpoint (only meaningful when BOT_MODE=webhook)
if (config.bot.mode === 'webhook') {
  app.post(config.bot.webhookPath, (req, res) => {
    try {
      getBot().processUpdate(req.body);
      res.sendStatus(200);
    } catch (err) {
      logger.error(`Failed to process webhook update: ${err.message}`, { stack: err.stack });
      res.sendStatus(500);
    }
  });
}

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Centralized Express error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  logger.error(`Express error: ${err.message}`, { stack: err.stack });
  res.status(500).json({ error: 'Internal server error' });
});

const server = app.listen(config.server.port, () => {
  logger.info(`HTTP server listening on port ${config.server.port} (env=${config.env})`);
});

// ---------------------------------------------------------------------------
// 4. Global process-level error handling (auto restart is delegated to PM2;
//    here we log fatally and exit so PM2's restart policy can take over).
// ---------------------------------------------------------------------------
process.on('unhandledRejection', (reason) => {
  logger.error(`Unhandled Promise Rejection: ${reason instanceof Error ? reason.stack : reason}`);
});

process.on('uncaughtException', (err) => {
  logger.error(`Uncaught Exception: ${err.message}`, { stack: err.stack });
  // Exit after logging so the process manager (PM2) restarts a clean instance.
  gracefulShutdown('uncaughtException').finally(() => process.exit(1));
});

// ---------------------------------------------------------------------------
// 5. Graceful shutdown on termination signals.
// ---------------------------------------------------------------------------
async function gracefulShutdown(signal) {
  logger.info(`Received ${signal}. Shutting down gracefully...`);
  try {
    if (config.bot.mode !== 'webhook') {
      await bot.stopPolling({ cancel: true });
      logger.info('Telegram polling stopped.');
    }
  } catch (err) {
    logger.error(`Error stopping bot polling: ${err.message}`);
  }

  server.close(() => {
    logger.info('HTTP server closed. Goodbye!');
    process.exit(0);
  });

  // Force-exit if something hangs during shutdown.
  setTimeout(() => process.exit(1), 8000).unref();
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

module.exports = { app, bot };
