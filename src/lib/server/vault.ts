import { execFile } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import { eq } from 'drizzle-orm';
import matter from 'gray-matter';
import { marked } from 'marked';
import { db } from './db';
import { vaultTasks } from './db/schema';

const MIRROR_ROOT = resolve(process.env.VAULT_MIRROR_PATH ?? './data/vault-mirror');
const DASHBOARD_FOLDER = process.env.VAULT_DASHBOARD_FOLDER ?? 'Dashboard Sync';
const PUSH_CMD = process.env.VAULT_SYNC_PUSH_CMD;
const TASKS_FILENAME = 'Tasks.md';

export interface VaultNoteSummary {
	path: string;
	title: string;
	updatedAt: string;
	frontmatter: Record<string, unknown>;
	excerpt: string | null;
}

export interface VaultNote extends VaultNoteSummary {
	html: string;
	raw: string;
}

/**
 * Semua akses file harus lewat sini - mencegah path traversal dari param URL
 * (mis. /vault/../../etc) keluar dari VAULT_MIRROR_PATH.
 */
function safeResolve(relPath: string): string {
	const target = resolve(MIRROR_ROOT, relPath);
	if (target !== MIRROR_ROOT && !target.startsWith(MIRROR_ROOT + sep)) {
		throw new Error('Path di luar vault mirror.');
	}
	return target;
}

function toTitle(relPath: string, frontmatter: Record<string, unknown>): string {
	if (typeof frontmatter.title === 'string' && frontmatter.title.trim()) {
		return frontmatter.title.trim();
	}
	const base = relPath.split('/').pop() ?? relPath;
	return base.replace(/\.md$/i, '');
}

function excerptOf(content: string): string | null {
	const line = content.split(/\r?\n/).find((l) => l.trim().length > 0 && !l.trim().startsWith('#'));
	if (!line) return null;
	const trimmed = line.trim();
	return trimmed.length > 160 ? trimmed.slice(0, 160) + '…' : trimmed;
}

function readNoteSummary(absPath: string, relPath: string): VaultNoteSummary {
	const raw = readFileSync(absPath, 'utf8');
	const { data, content } = matter(raw);
	const stat = statSync(absPath);
	return {
		path: relPath,
		title: toTitle(relPath, data),
		updatedAt: stat.mtime.toISOString(),
		frontmatter: data,
		excerpt: excerptOf(content)
	};
}

/** Daftar note (read-only) di sebuah folder relatif terhadap root mirror. */
export function listFolder(folderRelPath: string, limit = 50): VaultNoteSummary[] {
	const abs = safeResolve(folderRelPath);
	if (!existsSync(abs)) return [];
	const entries = readdirSync(abs, { withFileTypes: true }).filter(
		(e) => e.isFile() && e.name.toLowerCase().endsWith('.md')
	);
	const summaries = entries.map((e) =>
		readNoteSummary(join(abs, e.name), `${folderRelPath}/${e.name}`)
	);
	return summaries.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, limit);
}

export interface VaultDirEntry {
	name: string;
	path: string;
}

/** Folder/file bawaan Obsidian & git yang tidak perlu ditampilkan di browser. */
function isIgnoredEntry(name: string): boolean {
	return name.startsWith('.');
}

/**
 * Isi satu folder (subfolder + note langsung di dalamnya, bukan rekursif) -
 * dipakai halaman /vault/browse untuk menjelajah seluruh vault, bukan cuma
 * folder yang di-hardcode di dashboard utama.
 */
export function listDir(
	folderRelPath: string
): { folders: VaultDirEntry[]; notes: VaultNoteSummary[] } | null {
	const abs = safeResolve(folderRelPath);
	if (!existsSync(abs) || !statSync(abs).isDirectory()) return null;
	const entries = readdirSync(abs, { withFileTypes: true }).filter((e) => !isIgnoredEntry(e.name));

	const folders = entries
		.filter((e) => e.isDirectory())
		.map((e) => ({
			name: e.name,
			path: folderRelPath ? `${folderRelPath}/${e.name}` : e.name
		}))
		.sort((a, b) => a.name.localeCompare(b.name));

	const notes = entries
		.filter((e) => e.isFile() && e.name.toLowerCase().endsWith('.md'))
		.map((e) =>
			readNoteSummary(join(abs, e.name), folderRelPath ? `${folderRelPath}/${e.name}` : e.name)
		)
		.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

	return { folders, notes };
}

/** Cari note lewat judul/nama file di seluruh vault, rekursif. */
export function searchNotes(query: string, limit = 100): VaultNoteSummary[] {
	const q = query.toLowerCase();
	const results: VaultNoteSummary[] = [];

	function walk(relPath: string): void {
		const abs = safeResolve(relPath);
		const entries = readdirSync(abs, { withFileTypes: true }).filter((e) => !isIgnoredEntry(e.name));
		for (const e of entries) {
			const childRel = relPath ? `${relPath}/${e.name}` : e.name;
			if (e.isDirectory()) {
				walk(childRel);
			} else if (e.isFile() && e.name.toLowerCase().endsWith('.md') && childRel.toLowerCase().includes(q)) {
				results.push(readNoteSummary(join(abs, e.name), childRel));
			}
		}
	}

	walk('');
	return results.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, limit);
}

/** Baca satu note (read-only) dengan body dirender ke HTML. */
export function readNote(relPath: string): VaultNote | null {
	const abs = safeResolve(relPath);
	if (!existsSync(abs) || !statSync(abs).isFile()) return null;
	const summary = readNoteSummary(abs, relPath);
	const raw = readFileSync(abs, 'utf8');
	const { content } = matter(raw);
	return { ...summary, raw: content, html: marked.parse(content, { async: false }) as string };
}

/**
 * Trigger push mirror -> Drive setelah dashboard menulis file (fire-and-forget;
 * pull sync terjadwal tetap jadi jaring pengaman kalau push ini gagal/telat).
 */
function triggerPush(): void {
	if (!PUSH_CMD) return;
	execFile(PUSH_CMD, (err) => {
		if (err) console.error('vault sync push gagal:', err);
	});
}

function slugifyFilename(title: string): string {
	const cleaned = title
		.trim()
		.replace(/[\\/:*?"<>|]/g, '')
		.slice(0, 80);
	return cleaned.length > 0 ? cleaned : `Note ${Date.now()}`;
}

function uniqueTargetPath(folderAbs: string, baseName: string): string {
	let candidate = `${baseName}.md`;
	let n = 2;
	while (existsSync(join(folderAbs, candidate))) {
		candidate = `${baseName} ${n}.md`;
		n += 1;
	}
	return candidate;
}

export interface CreateNoteInput {
	title: string;
	tags?: string[];
	body: string;
}

/** Note baru selalu ditulis ke folder yang dimiliki dashboard, bukan sembarang path. */
export function createNote(input: CreateNoteInput): string {
	const folderAbs = safeResolve(DASHBOARD_FOLDER);
	mkdirSync(folderAbs, { recursive: true });
	const filename = uniqueTargetPath(folderAbs, slugifyFilename(input.title));
	const relPath = `${DASHBOARD_FOLDER}/${filename}`;
	const frontmatter: Record<string, unknown> = {
		title: input.title,
		created: new Date().toISOString(),
		tags: input.tags ?? []
	};
	writeFileSync(safeResolve(relPath), matter.stringify(input.body, frontmatter), 'utf8');
	triggerPush();
	return relPath;
}

// --- Tasks (two-way): plain checkboxes in "<Dashboard Sync>/Tasks.md" ---

const TASK_LINE = /^-\s\[([ xX])\]\s+(.*)$/;

export interface VaultTaskRow {
	id: number;
	text: string;
	done: boolean;
	position: number;
}

function tasksFileAbsPath(): string {
	return safeResolve(`${DASHBOARD_FOLDER}/${TASKS_FILENAME}`);
}

/**
 * Parse Tasks.md dan upsert ke tabel vault_tasks, dipanggil setelah tiap pull
 * sync (lihat scripts/vault-tasks-resync.ts) dan sebelum menampilkan daftar
 * tugas di dashboard. Task yang hilang dari file TIDAK dihapus dari DB -
 * pull sync yang gagal/parsial tidak boleh mengarang penghapusan.
 */
export function syncTasksFromFile(): void {
	const abs = tasksFileAbsPath();
	if (!existsSync(abs)) return;
	const lines = readFileSync(abs, 'utf8').split(/\r?\n/);
	let position = 0;
	for (const line of lines) {
		const m = TASK_LINE.exec(line);
		if (!m) continue;
		const done = m[1].toLowerCase() === 'x';
		const text = m[2].trim();
		if (!text) continue;

		const existing = db.select().from(vaultTasks).where(eq(vaultTasks.text, text)).get();
		const now = new Date().toISOString();
		if (existing) {
			db.update(vaultTasks)
				.set({ done: done ? 1 : 0, position, updatedAt: now })
				.where(eq(vaultTasks.id, existing.id))
				.run();
		} else {
			db.insert(vaultTasks).values({ text, done: done ? 1 : 0, position, createdAt: now, updatedAt: now }).run();
		}
		position += 1;
	}
}

export function listTasks(): VaultTaskRow[] {
	const rows = db.select().from(vaultTasks).orderBy(vaultTasks.position).all();
	return rows.map((r) => ({ id: r.id, text: r.text, done: !!r.done, position: r.position }));
}

/** Tulis ulang Tasks.md dari state DB, lalu push ke Drive. */
function writeTasksFile(): void {
	const rows = listTasks();
	const abs = tasksFileAbsPath();
	mkdirSync(dirname(abs), { recursive: true });
	const body = ['# Dashboard Tasks', '', ...rows.map((r) => `- [${r.done ? 'x' : ' '}] ${r.text}`), ''].join(
		'\n'
	);
	writeFileSync(abs, body, 'utf8');
	triggerPush();
}

export function toggleTask(id: number): void {
	const existing = db.select().from(vaultTasks).where(eq(vaultTasks.id, id)).get();
	if (!existing) return;
	db.update(vaultTasks)
		.set({ done: existing.done ? 0 : 1, updatedAt: new Date().toISOString() })
		.where(eq(vaultTasks.id, id))
		.run();
	writeTasksFile();
}

export function addTask(text: string): void {
	const trimmed = text.trim();
	if (!trimmed) return;
	const maxPosition = db.select().from(vaultTasks).all().reduce((m, r) => Math.max(m, r.position), -1);
	const now = new Date().toISOString();
	db.insert(vaultTasks)
		.values({ text: trimmed, done: 0, position: maxPosition + 1, createdAt: now, updatedAt: now })
		.run();
	writeTasksFile();
}
