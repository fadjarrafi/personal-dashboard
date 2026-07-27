-- Initial schema for personal-dashboard.
-- Drizzle-generated tables live alongside FTS5 virtual table + triggers.
-- FTS5 must be authored as raw SQL (drizzle has no helper).

CREATE TABLE IF NOT EXISTS users (
	id         INTEGER PRIMARY KEY AUTOINCREMENT,
	email      TEXT UNIQUE NOT NULL,
	password   TEXT NOT NULL,
	created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
	id         TEXT PRIMARY KEY,
	user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	expires_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

CREATE TABLE IF NOT EXISTS items (
	id          INTEGER PRIMARY KEY AUTOINCREMENT,
	user_id     INTEGER NOT NULL REFERENCES users(id),
	type        TEXT NOT NULL CHECK (type IN ('bookmark','note','snippet')),
	title       TEXT,
	body        TEXT,
	url         TEXT,
	language    TEXT,
	pinned      INTEGER NOT NULL DEFAULT 0,
	created_at  TEXT NOT NULL DEFAULT (datetime('now')),
	updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
	archived_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_items_user_type ON items(user_id, type);
CREATE INDEX IF NOT EXISTS idx_items_pinned_updated ON items(pinned DESC, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_items_archived ON items(archived_at);

CREATE TABLE IF NOT EXISTS tags (
	id   INTEGER PRIMARY KEY AUTOINCREMENT,
	name TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS item_tags (
	item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
	tag_id  INTEGER NOT NULL REFERENCES tags(id)  ON DELETE CASCADE,
	PRIMARY KEY (item_id, tag_id)
);
CREATE INDEX IF NOT EXISTS idx_item_tags_tag ON item_tags(tag_id);

-- Full-text search over items (title + body).
CREATE VIRTUAL TABLE IF NOT EXISTS items_fts USING fts5(
	title,
	body,
	content='items',
	content_rowid='id',
	tokenize='unicode61 remove_diacritics 2'
);

-- Keep FTS in sync with items.
CREATE TRIGGER IF NOT EXISTS items_ai AFTER INSERT ON items BEGIN
	INSERT INTO items_fts(rowid, title, body) VALUES (new.id, new.title, new.body);
END;

CREATE TRIGGER IF NOT EXISTS items_ad AFTER DELETE ON items BEGIN
	INSERT INTO items_fts(items_fts, rowid, title, body) VALUES ('delete', old.id, old.title, old.body);
END;

CREATE TRIGGER IF NOT EXISTS items_au AFTER UPDATE ON items BEGIN
	INSERT INTO items_fts(items_fts, rowid, title, body) VALUES ('delete', old.id, old.title, old.body);
	INSERT INTO items_fts(rowid, title, body) VALUES (new.id, new.title, new.body);
END;
