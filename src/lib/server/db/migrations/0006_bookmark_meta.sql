-- Bookmark favicon + preview image: hotlinked (not downloaded) URLs,
-- best-effort auto-fetched the same way title already is. Plain nullable
-- columns with no CHECK/NOT NULL/UNIQUE, so ALTER TABLE ADD COLUMN is a
-- safe metadata-only change in SQLite - no table-rebuild dance needed
-- (that's only required when adding/changing a CHECK constraint, e.g.
-- items.type). Doesn't touch items_fts or its triggers (they only key off
-- title/body).

ALTER TABLE items ADD COLUMN favicon_url TEXT;
ALTER TABLE items ADD COLUMN preview_image_url TEXT;
