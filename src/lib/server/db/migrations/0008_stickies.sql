-- Stickies: kartu catatan singkat berwarna (pengganti fitur /tasks di UI).
-- content disimpan sebagai HTML ter-sanitasi (allowlist b/i/div/br/checkbox,
-- lihat src/lib/server/stickies.ts). Tabel tasks/task_tags LAMA sengaja tidak
-- di-drop supaya data lama tetap aman.

CREATE TABLE IF NOT EXISTS stickies (
	id         INTEGER PRIMARY KEY AUTOINCREMENT,
	user_id    INTEGER NOT NULL REFERENCES users(id),
	content    TEXT NOT NULL DEFAULT '',
	color      TEXT NOT NULL DEFAULT 'blue',
	created_at TEXT NOT NULL DEFAULT (datetime('now')),
	updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_stickies_user_created ON stickies(user_id, created_at);
