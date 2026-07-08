/**
 * sessionManager.js
 * Lightweight in-memory session store to track multi-step conversational
 * flows (e.g. "admin is composing a broadcast", "admin is creating a notice").
 * Keyed by Telegram user id. Sessions auto-expire after a timeout to avoid
 * users getting stuck in a stale flow.
 */

'use strict';

const SESSION_TTL_MS = 10 * 60 * 1000; // 10 minutes
const sessions = new Map();

/** Sets/updates the session state for a user. */
function setSession(telegramId, state) {
  sessions.set(telegramId, { ...state, updatedAt: Date.now() });
}

/** Retrieves the current session state for a user, or null if none/expired. */
function getSession(telegramId) {
  const session = sessions.get(telegramId);
  if (!session) return null;
  if (Date.now() - session.updatedAt > SESSION_TTL_MS) {
    sessions.delete(telegramId);
    return null;
  }
  return session;
}

/** Clears a user's session (flow completed or cancelled). */
function clearSession(telegramId) {
  sessions.delete(telegramId);
}

/** Periodically purges expired sessions to bound memory usage. */
function startCleanupInterval() {
  setInterval(() => {
    const now = Date.now();
    for (const [key, session] of sessions.entries()) {
      if (now - session.updatedAt > SESSION_TTL_MS) {
        sessions.delete(key);
      }
    }
  }, 5 * 60 * 1000).unref();
}

module.exports = { setSession, getSession, clearSession, startCleanupInterval };
