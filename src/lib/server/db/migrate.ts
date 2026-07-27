import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { raw } from './index';

const MIGRATIONS_DIR = new URL('./migrations', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');

raw.exec(`CREATE TABLE IF NOT EXISTS _migrations (
	name TEXT PRIMARY KEY,
	applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);`);

const applied = new Set(
	raw.prepare('SELECT name FROM _migrations').all().map((r) => (r as { name: string }).name)
);

const files = readdirSync(MIGRATIONS_DIR)
	.filter((f) => f.endsWith('.sql'))
	.sort();

for (const file of files) {
	if (applied.has(file)) {
		console.log(`skip  ${file}`);
		continue;
	}
	const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf8');
	console.log(`apply ${file}`);
	raw.exec('BEGIN');
	try {
		raw.exec(sql);
		raw.prepare('INSERT INTO _migrations (name) VALUES (?)').run(file);
		raw.exec('COMMIT');
	} catch (err) {
		raw.exec('ROLLBACK');
		throw err;
	}
}

console.log('migrations done');
