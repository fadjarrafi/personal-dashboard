-- Urutan manual sticky (drag-to-reorder). position ASC = tampil lebih dulu.
-- Backfill -id mempertahankan urutan lama (terbaru di atas); sticky baru diberi
-- MIN(position) - 1 sehingga tetap muncul paling atas.

ALTER TABLE stickies ADD COLUMN position INTEGER NOT NULL DEFAULT 0;
UPDATE stickies SET position = -id;
CREATE INDEX IF NOT EXISTS idx_stickies_user_position ON stickies(user_id, position);
