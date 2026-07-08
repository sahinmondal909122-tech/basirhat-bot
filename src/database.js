/**
 * database.js
 * Database connection layer. Defaults to SQLite (via better-sqlite3) and is
 * structured so switching to MySQL only requires implementing the same
 * method surface (get/all/run/exec/transaction) in a MySQL adapter and
 * swapping it in based on config.database.driver.
 *
 * All queries use parameterized statements ($param or ?) to prevent SQL injection.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const config = require('./config');
const { logger } = require('./logger');

/**
 * SQLite adapter implementing a small, consistent query interface.
 * Using a class keeps the surface swappable for a future MySQL adapter
 * without touching calling code (services/*.js only use these methods).
 */
class SQLiteAdapter {
  constructor(filePath) {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    this.db = new Database(filePath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
  }

  /** Run schema.sql to ensure all tables exist (idempotent). */
  migrate(schemaPath) {
    const schema = fs.readFileSync(schemaPath, 'utf8');
    this.db.exec(schema);
  }

  /** SELECT single row. params can be an array or object of bound values. */
  get(sql, params = []) {
    return this.db.prepare(sql).get(params);
  }

  /** SELECT multiple rows. */
  all(sql, params = []) {
    return this.db.prepare(sql).all(params);
  }

  /** INSERT / UPDATE / DELETE. Returns { changes, lastInsertRowid }. */
  run(sql, params = []) {
    const result = this.db.prepare(sql).run(params);
    return { changes: result.changes, lastInsertRowid: result.lastInsertRowid };
  }

  /** Execute raw multi-statement SQL (e.g. schema creation). */
  exec(sql) {
    this.db.exec(sql);
  }

  /** Wraps a function in a DB transaction for atomic multi-step writes. */
  transaction(fn) {
    return this.db.transaction(fn);
  }

  /** Creates a physical backup copy of the database file (used by admin backup feature). */
  backup(destPath) {
    return this.db.backup(destPath);
  }

  close() {
    this.db.close();
  }
}

let adapter;

function initDatabase() {
  if (config.database.driver === 'mysql') {
    // Placeholder guard: to migrate to MySQL, implement a MySQLAdapter class
    // with the same method surface (get/all/run/exec/transaction/backup/close)
    // using `mysql2` and swap it in here. Business logic in services/ will
    // continue to work unchanged since it only depends on this interface.
    throw new Error(
      'MySQL driver selected but MySQLAdapter is not implemented. ' +
        'Implement src/database.mysql.js with the same interface as SQLiteAdapter, ' +
        'then wire it in here to complete the migration.'
    );
  }

  adapter = new SQLiteAdapter(config.database.sqlitePath);
  const schemaPath = path.join(config.paths.database, 'schema.sql');
  adapter.migrate(schemaPath);
  logger.info(`Database initialized (driver=${config.database.driver}, path=${config.database.sqlitePath})`);
  return adapter;
}

function getDb() {
  if (!adapter) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return adapter;
}

module.exports = { initDatabase, getDb };
