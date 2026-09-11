-- Fitur brainstorming board (Excalidraw). Data scene (elements/appState/file
-- gambar tertanam) disimpan sebagai file di disk, bukan di kolom ini - scene
-- bisa membesar (gambar tertanam) dan itu tak seharusnya masuk ke file
-- SQLite/WAL, sama seperti pola receipts.image_path.

CREATE TABLE IF NOT EXISTS boards (
	id          INTEGER PRIMARY KEY AUTOINCREMENT,
	user_id     INTEGER NOT NULL REFERENCES users(id),
	title       TEXT NOT NULL DEFAULT 'Untitled board',
	scene_path  TEXT NOT NULL,
	archived_at TEXT,
	created_at  TEXT NOT NULL DEFAULT (datetime('now')),
	updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_boards_user_updated ON boards(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_boards_archived ON boards(archived_at);
