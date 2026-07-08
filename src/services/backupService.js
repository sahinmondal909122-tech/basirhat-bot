/**
 * backupService.js
 * Handles database backups (full file copy for SQLite) and CSV export of users.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const config = require('../config');
const { getDb } = require('../database');
const { logger } = require('../logger');

const BACKUP_DIR = path.join(config.paths.database, 'backups');

function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

/**
 * Performs a full database backup by copying the SQLite file with a timestamped name.
 * @returns {string} path to the created backup file
 */
function performBackup() {
  ensureBackupDir();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const destPath = path.join(BACKUP_DIR, `backup-${timestamp}.db`);

  if (config.database.driver === 'sqlite') {
    fs.copyFileSync(config.database.sqlitePath, destPath);
  } else {
    throw new Error('Backup is only implemented for the SQLite driver in this build.');
  }

  logger.info(`Database backup created at ${destPath}`);
  pruneOldBackups();
  return destPath;
}

/** Keeps only the most recent 14 backups to avoid unbounded disk usage. */
function pruneOldBackups(keep = 14) {
  ensureBackupDir();
  const files = fs
    .readdirSync(BACKUP_DIR)
    .filter((f) => f.startsWith('backup-') && f.endsWith('.db'))
    .map((f) => ({ name: f, time: fs.statSync(path.join(BACKUP_DIR, f)).mtimeMs }))
    .sort((a, b) => b.time - a.time);

  files.slice(keep).forEach((f) => {
    fs.unlinkSync(path.join(BACKUP_DIR, f.name));
  });
}

/** Returns list of existing backup files, most recent first. */
function listBackups() {
  ensureBackupDir();
  return fs
    .readdirSync(BACKUP_DIR)
    .filter((f) => f.endsWith('.db'))
    .map((f) => ({ name: f, path: path.join(BACKUP_DIR, f), time: fs.statSync(path.join(BACKUP_DIR, f)).mtime }))
    .sort((a, b) => b.time - a.time);
}

/**
 * Exports all users to a CSV file and returns its path.
 */
function exportUsersToCsv() {
  const db = getDb();
  const users = db.all(
    `SELECT telegram_id, username, first_name, last_name, language_code,
            is_admin, is_blocked, is_active, joined_at, last_seen_at
     FROM users ORDER BY joined_at DESC`
  );

  const header = [
    'telegram_id',
    'username',
    'first_name',
    'last_name',
    'language_code',
    'is_admin',
    'is_blocked',
    'is_active',
    'joined_at',
    'last_seen_at',
  ];

  const escapeCsv = (val) => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = users.map((u) => header.map((h) => escapeCsv(u[h])).join(','));
  const csvContent = [header.join(','), ...rows].join('\n');

  ensureBackupDir();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const csvPath = path.join(BACKUP_DIR, `users-export-${timestamp}.csv`);
  fs.writeFileSync(csvPath, csvContent, 'utf8');
  return csvPath;
}

module.exports = { performBackup, listBackups, exportUsersToCsv };
