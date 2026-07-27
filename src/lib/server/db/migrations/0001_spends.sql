-- v0.2 Spend Tracker
-- Simpan amount sebagai INTEGER (rupiah bulat) - kunci di PRD §11.2, hindari float.
-- Kategori disimpan sebagai teks bebas (autocomplete dihitung dari data yang ada).
-- Merchant/method/refId opsional untuk mendukung share-from-receipt di Fase 3.

CREATE TABLE IF NOT EXISTS spends (
	id           INTEGER PRIMARY KEY AUTOINCREMENT,
	user_id      INTEGER NOT NULL REFERENCES users(id),
	amount       INTEGER NOT NULL CHECK (amount >= 0),  -- rupiah bulat
	currency     TEXT NOT NULL DEFAULT 'IDR',
	category     TEXT,
	merchant     TEXT,
	note         TEXT,
	method       TEXT,             -- gopay, blu, jago, livin, manual, dsb.
	ref_id       TEXT,             -- ID transaksi dari receipt (opsional)
	occurred_at  TEXT NOT NULL,    -- tanggal transaksi (bukan created_at)
	created_at   TEXT NOT NULL DEFAULT (datetime('now')),
	updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_spends_user_occurred ON spends(user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_spends_user_category ON spends(user_id, category);
-- Cegah dupe saat share receipt yang sama dua kali (ref_id per user).
CREATE UNIQUE INDEX IF NOT EXISTS uniq_spends_user_ref ON spends(user_id, ref_id)
	WHERE ref_id IS NOT NULL;

-- Simpan receipt asli untuk audit + fase share/OCR. Dipisah dari spends agar
-- 1 spend bisa punya 0 atau 1 receipt tanpa membebani row utama.
CREATE TABLE IF NOT EXISTS receipts (
	id             INTEGER PRIMARY KEY AUTOINCREMENT,
	spend_id       INTEGER REFERENCES spends(id) ON DELETE SET NULL,
	user_id        INTEGER NOT NULL REFERENCES users(id),
	image_path     TEXT,           -- path relatif di disk (data/receipts/...)
	mime           TEXT,
	ocr_text       TEXT,           -- hasil mentah tesseract
	extracted_json TEXT,           -- JSON hasil parser (amount/merchant/dst)
	created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_receipts_user ON receipts(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_receipts_spend ON receipts(spend_id);
