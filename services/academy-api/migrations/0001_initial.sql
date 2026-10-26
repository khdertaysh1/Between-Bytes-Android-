CREATE TABLE feedback (
 id TEXT PRIMARY KEY, created_at INTEGER NOT NULL, kind TEXT NOT NULL,
 title TEXT NOT NULL, message TEXT NOT NULL, case_id TEXT, email TEXT,
 status TEXT NOT NULL DEFAULT 'new' CHECK(status IN ('new','reviewing','resolved')),
 admin_note TEXT NOT NULL DEFAULT '', updated_at INTEGER NOT NULL
);
CREATE INDEX feedback_created ON feedback(created_at DESC);
CREATE INDEX feedback_status ON feedback(status,created_at DESC);
CREATE TABLE sessions (
 id TEXT PRIMARY KEY, started_at INTEGER NOT NULL, last_seen INTEGER NOT NULL,
 last_active_at INTEGER NOT NULL, device TEXT NOT NULL, referrer TEXT NOT NULL, country TEXT NOT NULL
);
CREATE TABLE events (
 id TEXT PRIMARY KEY, received_at INTEGER NOT NULL, session_id TEXT NOT NULL,
 kind TEXT NOT NULL CHECK(kind IN ('view','attempt','complete','active')),
 case_id TEXT NOT NULL DEFAULT '', mode TEXT NOT NULL DEFAULT '', http_status INTEGER,
 active_seconds INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX events_received ON events(received_at);
CREATE INDEX events_case_kind ON events(case_id,kind,received_at);
CREATE TABLE rate_limits (key TEXT PRIMARY KEY, hits INTEGER NOT NULL, expires_at INTEGER NOT NULL);
CREATE TABLE admin_sessions (token_hash TEXT PRIMARY KEY, expires_at INTEGER NOT NULL);
CREATE UNIQUE INDEX events_one_completion ON events(session_id,case_id) WHERE kind='complete';
