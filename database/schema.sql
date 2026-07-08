-- ==========================================================
-- Basirhat College Updates Bot - Database Schema
-- Compatible with SQLite (default). Minor type tweaks noted
-- in comments allow easy migration to MySQL.
-- ==========================================================

-- USERS TABLE: every Telegram user who has interacted with the bot
CREATE TABLE IF NOT EXISTS users (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_id     INTEGER UNIQUE NOT NULL,
    username        TEXT,
    first_name      TEXT,
    last_name       TEXT,
    language_code   TEXT,
    is_admin        INTEGER NOT NULL DEFAULT 0,      -- 0 = false, 1 = true
    is_blocked      INTEGER NOT NULL DEFAULT 0,      -- user blocked the bot
    is_active       INTEGER NOT NULL DEFAULT 1,
    joined_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_seen_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users (telegram_id);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users (is_active);

-- MESSAGES TABLE: log of inbound messages/commands (for analytics & support)
CREATE TABLE IF NOT EXISTS messages (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_id     INTEGER NOT NULL,
    chat_id         INTEGER NOT NULL,
    message_type    TEXT NOT NULL,                   -- text, photo, document, command, callback
    content         TEXT,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (telegram_id) REFERENCES users (telegram_id)
);

CREATE INDEX IF NOT EXISTS idx_messages_telegram_id ON messages (telegram_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages (created_at);

-- NOTICES TABLE: notices/announcements published by admins
CREATE TABLE IF NOT EXISTS notices (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    title           TEXT NOT NULL,
    content         TEXT NOT NULL,
    category        TEXT DEFAULT 'general',          -- exam, admission, holiday, scholarship, library, general...
    file_id         TEXT,                             -- optional attached Telegram file_id
    file_type       TEXT,                             -- document, photo, video
    is_pinned       INTEGER NOT NULL DEFAULT 0,
    is_deleted      INTEGER NOT NULL DEFAULT 0,
    created_by      INTEGER,                          -- telegram_id of admin
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notices_deleted ON notices (is_deleted);
CREATE INDEX IF NOT EXISTS idx_notices_category ON notices (category);
CREATE INDEX IF NOT EXISTS idx_notices_pinned ON notices (is_pinned);

-- BROADCASTS TABLE: history of broadcast campaigns sent by admins
CREATE TABLE IF NOT EXISTS broadcasts (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    admin_id        INTEGER NOT NULL,
    content_type    TEXT NOT NULL,                   -- text, photo, pdf, video
    content         TEXT,                             -- text body or caption
    file_id         TEXT,                             -- Telegram file_id for media broadcasts
    total_recipients INTEGER DEFAULT 0,
    success_count   INTEGER DEFAULT 0,
    failed_count    INTEGER DEFAULT 0,
    status          TEXT NOT NULL DEFAULT 'pending',  -- pending, scheduled, in_progress, completed, failed, cancelled
    scheduled_at    DATETIME,
    started_at      DATETIME,
    completed_at    DATETIME,
    failed_user_ids TEXT,                             -- JSON array of telegram_ids that failed (for retry)
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_broadcasts_status ON broadcasts (status);

-- FILES TABLE: generic registry of all uploaded files (materials, notices attachments, etc.)
CREATE TABLE IF NOT EXISTS files (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    file_id         TEXT NOT NULL,                    -- Telegram file_id
    file_unique_id  TEXT,
    file_name       TEXT,
    file_type       TEXT NOT NULL,                    -- pdf, docx, zip, png, jpeg, mp4, audio
    file_size       INTEGER,
    category        TEXT NOT NULL,                    -- routine, material, result, syllabus, notice
    subject_or_dept TEXT,
    semester        TEXT,
    uploaded_by     INTEGER,
    is_deleted      INTEGER NOT NULL DEFAULT 0,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_files_category ON files (category);
CREATE INDEX IF NOT EXISTS idx_files_deleted ON files (is_deleted);

-- ROUTINES TABLE: class routine PDFs per department/semester
CREATE TABLE IF NOT EXISTS routines (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    department      TEXT NOT NULL,
    semester        TEXT NOT NULL,
    file_id         TEXT NOT NULL,
    file_name       TEXT,
    uploaded_by     INTEGER,
    is_active       INTEGER NOT NULL DEFAULT 1,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_routines_active ON routines (is_active);

-- RESULTS TABLE: result PDFs per exam/semester
CREATE TABLE IF NOT EXISTS results (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    exam_name       TEXT NOT NULL,
    department      TEXT,
    semester        TEXT,
    file_id         TEXT NOT NULL,
    file_name       TEXT,
    uploaded_by     INTEGER,
    is_active       INTEGER NOT NULL DEFAULT 1,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_results_active ON results (is_active);

-- SYLLABUS TABLE: syllabus documents per department/semester
CREATE TABLE IF NOT EXISTS syllabus (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    department      TEXT NOT NULL,
    semester        TEXT,
    file_id         TEXT NOT NULL,
    file_name       TEXT,
    uploaded_by     INTEGER,
    is_active       INTEGER NOT NULL DEFAULT 1,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_syllabus_active ON syllabus (is_active);

-- SETTINGS TABLE: key-value store for runtime configuration (maintenance mode, links, etc.)
CREATE TABLE IF NOT EXISTS settings (
    key             TEXT PRIMARY KEY,
    value           TEXT,
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- LOGS TABLE: persisted structured logs mirrored into DB for admin dashboard queries
CREATE TABLE IF NOT EXISTS logs (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    level           TEXT NOT NULL,                    -- info, warn, error
    type            TEXT NOT NULL,                    -- COMMAND, USER_JOIN, USER_LEAVE, BROADCAST, UPLOAD, DOWNLOAD, ERROR
    message         TEXT,
    meta            TEXT,                              -- JSON blob
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_logs_type ON logs (type);
CREATE INDEX IF NOT EXISTS idx_logs_created_at ON logs (created_at);

-- WHATSAPP / EXTERNAL GROUP LINKS
CREATE TABLE IF NOT EXISTS links (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    label           TEXT NOT NULL,
    url             TEXT NOT NULL,
    category        TEXT NOT NULL DEFAULT 'group',    -- group, website, social
    is_active       INTEGER NOT NULL DEFAULT 1,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Default settings seed
INSERT OR IGNORE INTO settings (key, value) VALUES ('maintenance_mode', '0');
INSERT OR IGNORE INTO settings (key, value) VALUES ('college_website', 'https://basirhatcollege.ac.in');
