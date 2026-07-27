import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import * as schema from './schema';

const dbUrl = process.env.DATABASE_URL ?? './data/app.db';

const dir = dirname(dbUrl);
if (dir && !existsSync(dir)) {
	mkdirSync(dir, { recursive: true });
}

const sqlite = new Database(dbUrl);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');
sqlite.pragma('synchronous = NORMAL');

export const db = drizzle(sqlite, { schema });
export const raw = sqlite;
