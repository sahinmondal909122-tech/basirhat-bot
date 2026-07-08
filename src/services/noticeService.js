/**
 * noticeService.js
 * CRUD and search operations for college notices/announcements.
 */

'use strict';

const { getDb } = require('../database');

/** Creates a new notice. Returns inserted row id. */
function createNotice({ title, content, category = 'general', fileId = null, fileType = null, createdBy }) {
  const db = getDb();
  const result = db.run(
    `INSERT INTO notices (title, content, category, file_id, file_type, created_by)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [title, content, category, fileId, fileType, createdBy]
  );
  return result.lastInsertRowid;
}

/** Returns latest N non-deleted notices, pinned notices first. */
function getLatestNotices(limit = 10) {
  const db = getDb();
  return db.all(
    `SELECT * FROM notices WHERE is_deleted = 0
     ORDER BY is_pinned DESC, created_at DESC LIMIT ?`,
    [limit]
  );
}

/** Returns a single notice by id (excluding deleted). */
function getNoticeById(id) {
  const db = getDb();
  return db.get('SELECT * FROM notices WHERE id = ? AND is_deleted = 0', [id]);
}

/** Full text search across title/content/category using LIKE (parameterized, injection-safe). */
function searchNotices(keyword, limit = 15) {
  const db = getDb();
  const pattern = `%${keyword}%`;
  return db.all(
    `SELECT * FROM notices
     WHERE is_deleted = 0 AND (title LIKE ? OR content LIKE ? OR category LIKE ?)
     ORDER BY is_pinned DESC, created_at DESC
     LIMIT ?`,
    [pattern, pattern, pattern, limit]
  );
}

/** Updates a notice's title/content (edit feature). */
function updateNotice(id, { title, content }) {
  const db = getDb();
  const result = db.run(
    `UPDATE notices SET title = COALESCE(?, title), content = COALESCE(?, content),
     updated_at = CURRENT_TIMESTAMP WHERE id = ? AND is_deleted = 0`,
    [title || null, content || null, id]
  );
  return result.changes > 0;
}

/** Soft-deletes a notice. */
function deleteNotice(id) {
  const db = getDb();
  const result = db.run('UPDATE notices SET is_deleted = 1 WHERE id = ?', [id]);
  return result.changes > 0;
}

/** Pins a notice (and optionally unpins all others to keep a single pinned notice on top). */
function pinNotice(id, exclusive = true) {
  const db = getDb();
  const txn = db.transaction(() => {
    if (exclusive) {
      db.run('UPDATE notices SET is_pinned = 0 WHERE is_pinned = 1');
    }
    db.run('UPDATE notices SET is_pinned = 1 WHERE id = ?', [id]);
  });
  txn();
  return true;
}

/** Unpins a specific notice. */
function unpinNotice(id) {
  const db = getDb();
  const result = db.run('UPDATE notices SET is_pinned = 0 WHERE id = ?', [id]);
  return result.changes > 0;
}

/** Returns total (non-deleted) notice count. */
function getNoticeCount() {
  const db = getDb();
  const row = db.get('SELECT COUNT(*) AS count FROM notices WHERE is_deleted = 0');
  return row.count;
}

module.exports = {
  createNotice,
  getLatestNotices,
  getNoticeById,
  searchNotices,
  updateNotice,
  deleteNotice,
  pinNotice,
  unpinNotice,
  getNoticeCount,
};
