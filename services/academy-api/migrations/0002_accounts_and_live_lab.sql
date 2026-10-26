CREATE TABLE IF NOT EXISTS learners (id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, salt TEXT NOT NULL, created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS learner_sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES learners(id), expires_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS learner_sessions_user ON learner_sessions(user_id);
CREATE TABLE IF NOT EXISTS learner_progress (user_id TEXT NOT NULL REFERENCES learners(id), case_id TEXT NOT NULL, updated_at INTEGER NOT NULL, PRIMARY KEY(user_id,case_id));
CREATE TABLE IF NOT EXISTS live_sessions (token_hash TEXT PRIMARY KEY, expires_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS live_orders (session_hash TEXT NOT NULL, mode TEXT NOT NULL, request_id TEXT NOT NULL, unit_minor INTEGER NOT NULL, quantity INTEGER NOT NULL, total_minor INTEGER NOT NULL, created_at INTEGER NOT NULL, PRIMARY KEY(session_hash,mode,request_id));
