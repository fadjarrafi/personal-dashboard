/**
 * Buat backup DB SQLite yang aman-untuk-WAL, dan rotasi file lama.
 *
 * Jalankan: npm run db:backup
 * Cron: lihat README bagian Backup.
 *
 * Env:
 *   DATABASE_URL   sumber DB (default ./data/app.db)
 *   BACKUP_DIR     folder tujuan (default ./data/backups)
 *   BACKUP_KEEP    jumlah file terbaru yang dipertahankan (default 14)
 */
import { existsSync, mkdirSync, readdirSync, unlinkSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { raw } from '../src/lib/server/db/index';

const dir = resolve(process.env.BACKUP_DIR ?? './data/backups');
const keep = Math.max(1, Number(process.env.BACKUP_KEEP ?? '14'));

if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const dest = join(dir, `app-${stamp}.db`);

const res = await raw.backup(dest);
console.log(`backup ok  ${dest}  (${res.totalPages} pages)`);

const files = readdirSync(dir)
	.filter((f) => f.startsWith('app-') && f.endsWith('.db'))
	.sort();
const rotate = files.slice(0, Math.max(0, files.length - keep));
for (const f of rotate) {
	unlinkSync(join(dir, f));
	console.log(`rotate    ${f}`);
}
