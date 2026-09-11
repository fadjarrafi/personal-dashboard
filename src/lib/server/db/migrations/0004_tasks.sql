-- Fitur task/todo.
-- done_at merangkap sebagai penanda selesai/belum SEKALIGUS timestamp
-- penyelesaian (pola sama seperti bills.paid_at), supaya tak ada pasangan
-- boolean + timestamp yang redundan. due_at boleh NULL untuk tugas "someday"
-- tanpa tanggal jatuh tempo.

CREATE TABLE IF NOT EXISTS tasks (
	id          INTEGER PRIMARY KEY AUTOINCREMENT,
	user_id     INTEGER NOT NULL REFERENCES users(id),
	title       TEXT NOT NULL,
	notes       TEXT,
	due_at      TEXT,      -- NULL = tugas "someday", tanpa jatuh tempo
	priority    TEXT NOT NULL DEFAULT 'normal'
	            CHECK (priority IN ('low','normal','high')),
	pinned      INTEGER NOT NULL DEFAULT 0,
	done_at     TEXT,      -- NULL = belum selesai
	archived_at TEXT,
	created_at  TEXT NOT NULL DEFAULT (datetime('now')),
	updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_tasks_user_due ON tasks(user_id, due_at);
CREATE INDEX IF NOT EXISTS idx_tasks_archived ON tasks(archived_at);

CREATE TABLE IF NOT EXISTS task_tags (
	task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
	tag_id  INTEGER NOT NULL REFERENCES tags(id)  ON DELETE CASCADE,
	PRIMARY KEY (task_id, tag_id)
);
CREATE INDEX IF NOT EXISTS idx_task_tags_tag ON task_tags(tag_id);
