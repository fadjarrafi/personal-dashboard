-- Vault integration (Obsidian notes mirrored via rclone, see docs/DEPLOY-vault-sync.md).
-- Tasks live as plain markdown checkboxes in "Dashboard Sync/Tasks.md" so they stay
-- editable from Obsidian too; this table is a cache/mirror of that file's state, keyed
-- by task text (not id) since text is the only stable identity a markdown checkbox has.

CREATE TABLE IF NOT EXISTS vault_tasks (
	id         INTEGER PRIMARY KEY AUTOINCREMENT,
	text       TEXT NOT NULL UNIQUE,
	done       INTEGER NOT NULL DEFAULT 0,
	position   INTEGER NOT NULL DEFAULT 0,
	created_at TEXT NOT NULL DEFAULT (datetime('now')),
	updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
