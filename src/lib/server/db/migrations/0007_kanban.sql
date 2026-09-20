-- Kanban board (PRD §11.3) — board task generik, terpisah dari job tracker
-- dan dari fitur /tasks (todo list flat) yang sudah ada. Nama tabel diberi
-- prefix kanban_ karena `tasks`/`task_tags` sudah dipakai fitur /tasks.
-- Satu board implisit per user, kolom tetap (todo/in_progress/done).
-- spend_id hanya referensi opsional ke spends yang sudah ada — bukan duplikasi nilai uang.

CREATE TABLE IF NOT EXISTS kanban_tasks (
	id          INTEGER PRIMARY KEY AUTOINCREMENT,
	user_id     INTEGER NOT NULL REFERENCES users(id),
	title       TEXT NOT NULL,
	description TEXT,
	status      TEXT NOT NULL DEFAULT 'todo'
	            CHECK (status IN ('todo','in_progress','done')),
	priority    TEXT NOT NULL DEFAULT 'medium'
	            CHECK (priority IN ('low','medium','high')),
	due_date    TEXT,
	position    INTEGER NOT NULL DEFAULT 0,
	spend_id    INTEGER REFERENCES spends(id) ON DELETE SET NULL,
	created_at  TEXT NOT NULL DEFAULT (datetime('now')),
	updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
	archived_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_kanban_tasks_user_status_position ON kanban_tasks(user_id, status, position);
CREATE INDEX IF NOT EXISTS idx_kanban_tasks_user_archived ON kanban_tasks(user_id, archived_at);

CREATE TABLE IF NOT EXISTS kanban_checklist_items (
	id         INTEGER PRIMARY KEY AUTOINCREMENT,
	task_id    INTEGER NOT NULL REFERENCES kanban_tasks(id) ON DELETE CASCADE,
	content    TEXT NOT NULL,
	done       INTEGER NOT NULL DEFAULT 0,
	position   INTEGER NOT NULL DEFAULT 0,
	created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_kanban_checklist_task ON kanban_checklist_items(task_id, position);

CREATE TABLE IF NOT EXISTS kanban_task_tags (
	task_id INTEGER NOT NULL REFERENCES kanban_tasks(id) ON DELETE CASCADE,
	tag_id  INTEGER NOT NULL REFERENCES tags(id)  ON DELETE CASCADE,
	PRIMARY KEY (task_id, tag_id)
);
