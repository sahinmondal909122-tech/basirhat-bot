/**
 * fileService.js
 * Manages storage/retrieval of routines, results, syllabus and generic study
 * materials. Files themselves live on Telegram's servers; we persist the
 * file_id returned by Telegram along with descriptive metadata.
 */

'use strict';

const { getDb } = require('../database');

/* ---------------------------- Generic Files ---------------------------- */

function registerFile({ fileId, fileUniqueId, fileName, fileType, category, subjectOrDept = null, semester = null, uploadedBy }) {
  const db = getDb();
  const result = db.run(
    `INSERT INTO files (file_id, file_unique_id, file_name, file_type, category, subject_or_dept, semester, uploaded_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [fileId, fileUniqueId || null, fileName || null, fileType, category, subjectOrDept, semester, uploadedBy]
  );
  return result.lastInsertRowid;
}

function getFilesByCategory(category, limit = 20) {
  const db = getDb();
  return db.all(
    `SELECT * FROM files WHERE category = ? AND is_deleted = 0 ORDER BY created_at DESC LIMIT ?`,
    [category, limit]
  );
}

function deleteFile(id) {
  const db = getDb();
  const result = db.run('UPDATE files SET is_deleted = 1 WHERE id = ?', [id]);
  return result.changes > 0;
}

/* ------------------------------ Routines -------------------------------- */

function addRoutine({ department, semester, fileId, fileName, uploadedBy }) {
  const db = getDb();
  const result = db.run(
    `INSERT INTO routines (department, semester, file_id, file_name, uploaded_by) VALUES (?, ?, ?, ?, ?)`,
    [department, semester, fileId, fileName || null, uploadedBy]
  );
  return result.lastInsertRowid;
}

function getActiveRoutines() {
  const db = getDb();
  return db.all('SELECT * FROM routines WHERE is_active = 1 ORDER BY created_at DESC');
}

/* ------------------------------- Results -------------------------------- */

function addResult({ examName, department = null, semester = null, fileId, fileName, uploadedBy }) {
  const db = getDb();
  const result = db.run(
    `INSERT INTO results (exam_name, department, semester, file_id, file_name, uploaded_by)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [examName, department, semester, fileId, fileName || null, uploadedBy]
  );
  return result.lastInsertRowid;
}

function getActiveResults() {
  const db = getDb();
  return db.all('SELECT * FROM results WHERE is_active = 1 ORDER BY created_at DESC');
}

/* ------------------------------ Syllabus -------------------------------- */

function addSyllabus({ department, semester = null, fileId, fileName, uploadedBy }) {
  const db = getDb();
  const result = db.run(
    `INSERT INTO syllabus (department, semester, file_id, file_name, uploaded_by) VALUES (?, ?, ?, ?, ?)`,
    [department, semester, fileId, fileName || null, uploadedBy]
  );
  return result.lastInsertRowid;
}

function getActiveSyllabus() {
  const db = getDb();
  return db.all('SELECT * FROM syllabus WHERE is_active = 1 ORDER BY created_at DESC');
}

/* -------------------------------- Links ---------------------------------- */

function addLink({ label, url, category = 'group' }) {
  const db = getDb();
  const result = db.run(`INSERT INTO links (label, url, category) VALUES (?, ?, ?)`, [label, url, category]);
  return result.lastInsertRowid;
}

function getActiveLinks(category = null) {
  const db = getDb();
  if (category) {
    return db.all('SELECT * FROM links WHERE is_active = 1 AND category = ? ORDER BY created_at DESC', [category]);
  }
  return db.all('SELECT * FROM links WHERE is_active = 1 ORDER BY created_at DESC');
}

function deleteLink(id) {
  const db = getDb();
  const result = db.run('UPDATE links SET is_active = 0 WHERE id = ?', [id]);
  return result.changes > 0;
}

module.exports = {
  registerFile,
  getFilesByCategory,
  deleteFile,
  addRoutine,
  getActiveRoutines,
  addResult,
  getActiveResults,
  addSyllabus,
  getActiveSyllabus,
  addLink,
  getActiveLinks,
  deleteLink,
};
