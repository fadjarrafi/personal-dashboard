import { existsSync, mkdirSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { randomBytes } from 'node:crypto';
import { and, desc, eq } from 'drizzle-orm';
import { db, raw } from './db';
import { receipts } from './db/schema';

const RECEIPT_DIR = resolve(process.env.RECEIPT_DIR ?? './data/receipts');
const MAX_SIZE = 8 * 1024 * 1024; // 8 MB

const ALLOWED_MIME = new Set([
	'image/jpeg',
	'image/jpg',
	'image/png',
	'image/webp',
	'image/heic',
	'image/heif'
]);

function ensureDir() {
	if (!existsSync(RECEIPT_DIR)) mkdirSync(RECEIPT_DIR, { recursive: true });
}

function extFromMime(mime: string, fallback: string): string {
	const map: Record<string, string> = {
		'image/jpeg': '.jpg',
		'image/jpg': '.jpg',
		'image/png': '.png',
		'image/webp': '.webp',
		'image/heic': '.heic',
		'image/heif': '.heif'
	};
	return map[mime] ?? fallback ?? '.bin';
}

export interface SaveReceiptInput {
	userId: number;
	file: File;
}

export interface SavedReceipt {
	id: number;
	imagePath: string; // relatif ke RECEIPT_DIR
	mime: string;
}

export async function saveReceiptFile(input: SaveReceiptInput): Promise<SavedReceipt> {
	const { userId, file } = input;

	if (!file || file.size === 0) throw new Error('File kosong.');
	if (file.size > MAX_SIZE) throw new Error(`Ukuran melebihi ${MAX_SIZE / (1024 * 1024)} MB.`);
	const mime = (file.type || '').toLowerCase();
	if (!ALLOWED_MIME.has(mime)) throw new Error(`Tipe file tidak didukung: ${mime || '(unknown)'}`);

	ensureDir();
	const rawName = (file.name || 'receipt').toLowerCase();
	const originalExt = extname(rawName);
	const ext = extFromMime(mime, originalExt);
	const stamp = new Date().toISOString().replace(/[:.]/g, '-');
	const rand = randomBytes(4).toString('hex');
	const filename = `u${userId}-${stamp}-${rand}${ext}`;
	const fullPath = join(RECEIPT_DIR, filename);

	const buffer = Buffer.from(await file.arrayBuffer());
	await writeFile(fullPath, buffer);

	const result = db
		.insert(receipts)
		.values({
			userId,
			imagePath: filename,
			mime
		})
		.run();

	return {
		id: Number(result.lastInsertRowid),
		imagePath: filename,
		mime
	};
}

export function getReceipt(userId: number, id: number) {
	return db
		.select()
		.from(receipts)
		.where(and(eq(receipts.id, id), eq(receipts.userId, userId)))
		.get();
}

export async function readReceiptBytes(userId: number, id: number): Promise<{
	bytes: Buffer;
	mime: string;
} | null> {
	const row = getReceipt(userId, id);
	if (!row || !row.imagePath) return null;
	const fullPath = join(RECEIPT_DIR, row.imagePath);
	try {
		const bytes = await readFile(fullPath);
		return { bytes, mime: row.mime ?? 'application/octet-stream' };
	} catch {
		return null;
	}
}

/** Kaitkan receipt ke spend yang baru dibuat (dipanggil setelah createSpend). */
export function linkReceiptToSpend(userId: number, receiptId: number, spendId: number) {
	raw
		.prepare(
			`UPDATE receipts SET spend_id = ?
			 WHERE id = ? AND user_id = ?`
		)
		.run(spendId, receiptId, userId);
}

export function saveExtracted(receiptId: number, userId: number, extracted: unknown) {
	raw
		.prepare(
			`UPDATE receipts SET extracted_json = ?
			 WHERE id = ? AND user_id = ?`
		)
		.run(JSON.stringify(extracted), receiptId, userId);
}

export function listReceiptsForUser(userId: number, limit = 50) {
	return db
		.select()
		.from(receipts)
		.where(eq(receipts.userId, userId))
		.orderBy(desc(receipts.createdAt))
		.limit(limit)
		.all();
}
