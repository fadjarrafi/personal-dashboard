import { existsSync, mkdirSync } from 'node:fs';
import { readFile, unlink, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { db } from './db';
import { boards } from './db/schema';

const BOARD_DIR = resolve(process.env.BOARD_DIR ?? './data/boards');
// Backstop against a runaway client bug, not a real limit for normal use -
// scenes are mostly vector data; even a heavily-illustrated board with a few
// embedded images fits comfortably under this.
const MAX_SCENE_SIZE = 15 * 1024 * 1024; // 15 MB

const EMPTY_SCENE = JSON.stringify({
	type: 'excalidraw',
	version: 2,
	source: 'personal-dashboard',
	elements: [],
	appState: {},
	files: {}
});

function ensureDir() {
	if (!existsSync(BOARD_DIR)) mkdirSync(BOARD_DIR, { recursive: true });
}

function scenePathFor(id: number): string {
	return `board-${id}.json`;
}

export interface BoardRow {
	id: number;
	title: string;
	scenePath: string;
	archivedAt: string | null;
	createdAt: string;
	updatedAt: string;
}

export function listBoards(userId: number): BoardRow[] {
	return db
		.select()
		.from(boards)
		.where(and(eq(boards.userId, userId), isNull(boards.archivedAt)))
		.orderBy(desc(boards.updatedAt))
		.all() as BoardRow[];
}

export function getBoard(userId: number, id: number): BoardRow | null {
	const row = db
		.select()
		.from(boards)
		.where(and(eq(boards.id, id), eq(boards.userId, userId)))
		.get();
	return (row as BoardRow) ?? null;
}

export async function createBoard(userId: number, title: string): Promise<number> {
	const now = new Date().toISOString();
	const result = db
		.insert(boards)
		.values({
			userId,
			title: title.trim() || 'Untitled board',
			scenePath: '',
			createdAt: now,
			updatedAt: now
		})
		.run();
	const id = Number(result.lastInsertRowid);
	const scenePath = scenePathFor(id);
	db.update(boards).set({ scenePath }).where(eq(boards.id, id)).run();

	ensureDir();
	await writeFile(join(BOARD_DIR, scenePath), EMPTY_SCENE);
	return id;
}

export function renameBoard(userId: number, id: number, title: string): boolean {
	const existing = getBoard(userId, id);
	if (!existing) return false;
	db.update(boards)
		.set({ title: title.trim() || 'Untitled board', updatedAt: new Date().toISOString() })
		.where(and(eq(boards.id, id), eq(boards.userId, userId)))
		.run();
	return true;
}

export function archiveBoard(userId: number, id: number) {
	db.update(boards)
		.set({ archivedAt: new Date().toISOString() })
		.where(and(eq(boards.id, id), eq(boards.userId, userId)))
		.run();
}

export function unarchiveBoard(userId: number, id: number) {
	db.update(boards)
		.set({ archivedAt: null })
		.where(and(eq(boards.id, id), eq(boards.userId, userId)))
		.run();
}

export async function deleteBoard(userId: number, id: number) {
	const existing = getBoard(userId, id);
	if (!existing) return;
	db.delete(boards).where(and(eq(boards.id, id), eq(boards.userId, userId))).run();
	try {
		await unlink(join(BOARD_DIR, existing.scenePath));
	} catch {
		// file sudah hilang/tidak pernah ada - abaikan
	}
}

/** Mengembalikan teks JSON scene mentah (hasil serializeAsJSON Excalidraw). */
export async function readScene(userId: number, id: number): Promise<string | null> {
	const row = getBoard(userId, id);
	if (!row) return null;
	try {
		return await readFile(join(BOARD_DIR, row.scenePath), 'utf-8');
	} catch {
		return EMPTY_SCENE;
	}
}

export async function writeScene(userId: number, id: number, sceneJson: string): Promise<boolean> {
	const row = getBoard(userId, id);
	if (!row) return false;
	if (sceneJson.length > MAX_SCENE_SIZE) return false;
	try {
		JSON.parse(sceneJson);
	} catch {
		return false;
	}
	ensureDir();
	await writeFile(join(BOARD_DIR, row.scenePath), sceneJson);
	db.update(boards)
		.set({ updatedAt: new Date().toISOString() })
		.where(and(eq(boards.id, id), eq(boards.userId, userId)))
		.run();
	return true;
}
