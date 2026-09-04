-- Bill reminder (docs/PRD-bill-reminder.md)
-- Kategori & recurrence sengaja dibatasi CHECK enum (bukan teks bebas seperti
-- spends.category) - himpunannya kecil & stabil, daftar tetap mencegah
-- typo/variasi penulisan yang merusak filter/ringkasan.
-- window_notified_at/due_day_notified_at dipisah (bukan satu last_notified_at)
-- supaya skrip cron bisa mengirim maksimal 2 notifikasi per siklus (awal
-- jendela + hari-H) tanpa dobel, dan direset ke NULL setiap kali next_due_at
-- bergeser ke siklus berikutnya.

CREATE TABLE IF NOT EXISTS bills (
	id                  INTEGER PRIMARY KEY AUTOINCREMENT,
	user_id             INTEGER NOT NULL REFERENCES users(id),
	title               TEXT NOT NULL,
	amount              INTEGER NOT NULL CHECK (amount >= 0),  -- rupiah bulat, sama seperti spends.amount
	category            TEXT NOT NULL DEFAULT 'lainnya'
	                    CHECK (category IN ('listrik','internet','cicilan','langganan','kartu_kredit','lainnya')),
	recurrence          TEXT NOT NULL DEFAULT 'monthly'
	                    CHECK (recurrence IN ('none','monthly','weekly','custom_days')),
	interval_days       INTEGER,        -- wajib diisi hanya jika recurrence='custom_days'
	next_due_at         TEXT NOT NULL,  -- tanggal jatuh tempo siklus berjalan
	window_notified_at  TEXT,           -- next_due_at siklus yang sudah dikirimi reminder awal jendela
	due_day_notified_at TEXT,           -- next_due_at siklus yang sudah dikirimi reminder hari-H
	snoozed_until       TEXT,           -- reminder ditunda sampai tanggal ini
	paid_at             TEXT,           -- diisi saat recurrence='none' ditandai lunas
	archived_at         TEXT,
	created_at          TEXT NOT NULL DEFAULT (datetime('now')),
	updated_at          TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_bills_user_due ON bills(user_id, next_due_at);

-- Satu user, banyak subscription: device HP dan desktop masing-masing
-- mendaftarkan PushSubscription sendiri, semua menerima reminder yang sama.
CREATE TABLE IF NOT EXISTS push_subscriptions (
	id           INTEGER PRIMARY KEY AUTOINCREMENT,
	user_id      INTEGER NOT NULL REFERENCES users(id),
	endpoint     TEXT NOT NULL UNIQUE,
	p256dh       TEXT NOT NULL,
	auth         TEXT NOT NULL,
	device_label TEXT,
	created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions(user_id);
