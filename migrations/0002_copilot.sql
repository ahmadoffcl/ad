-- AdForge D1 schema — 0002_copilot
-- Forge Copilot: persistent chat threads + messages, plus a pending_action
-- slot for user-confirmed operations (scheduling, etc.).

CREATE TABLE IF NOT EXISTS copilot_threads (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT DEFAULT '',
  pending_action TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_copilot_threads_user
  ON copilot_threads(user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS copilot_messages (
  id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL REFERENCES copilot_threads(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'tool')),
  content TEXT NOT NULL DEFAULT '',
  cards TEXT DEFAULT '[]',
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_copilot_messages_thread
  ON copilot_messages(thread_id, created_at);
