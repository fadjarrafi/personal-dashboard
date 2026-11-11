import { and, asc, desc, eq, sql } from 'drizzle-orm';
import { db, raw } from './db';
import { stickies } from './db/schema';
import { isStickyColor, type StickyColor } from '$lib/stickies';

const MAX_CONTENT = 20_000;

export interface StickyRow {
	id: number;
	content: string;
	color: StickyColor;
	createdAt: string;
	updatedAt: string;
}

const ALLOWED = new Set(['b', 'strong', 'i', 'em', 'div', 'p', 'br']);

/**
 * Allowlist sanitizer. Setiap tag direbuild TANPA atribut (kecuali checkbox,
 * dengan `checked` saja); tag lain dibuang, `<` sisa di-escape. Konten dirender
 * kembali via innerHTML di klien, jadi ini pagar XSS-nya.
 */
export function sanitizeStickyHtml(input: string): string {
	const src = input.slice(0, MAX_CONTENT);
	const tagRe = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g;
	let out = '';
	let last = 0;
	const esc = (s: string) => s.replace(/</g, '&lt;');
	for (const m of src.matchAll(tagRe)) {
		out += esc(src.slice(last, m.index));
		last = m.index + m[0].length;
		const closing = m[1] === '/';
		const name = m[2].toLowerCase();
		if (ALLOWED.has(name)) {
			out += name === 'br' ? '<br>' : closing ? `</${name}>` : `<${name}>`;
		} else if (name === 'input' && !closing && /\btype\s*=\s*["']?checkbox\b/i.test(m[3])) {
			out += /\bchecked\b/i.test(m[3])
				? '<input type="checkbox" checked>'
				: '<input type="checkbox">';
		}
	}
	out += esc(src.slice(last));
	return out;
}

export function listStickies(userId: number): StickyRow[] {
	return db
		.select()
		.from(stickies)
		.where(eq(stickies.userId, userId))
		.orderBy(asc(stickies.position), desc(stickies.id))
		.all() as StickyRow[];
}

export function countStickies(userId: number): number {
	const row = db
		.select({ n: sql<number>`count(*)` })
		.from(stickies)
		.where(eq(stickies.userId, userId))
		.get();
	return row?.n ?? 0;
}

export function createSticky(userId: number, color: StickyColor = 'blue'): number {
	const now = new Date().toISOString();
	// MIN(position) - 1 keeps a new sticky at the top of the manual order.
	const top = db
		.select({ p: sql<number | null>`min(${stickies.position})` })
		.from(stickies)
		.where(eq(stickies.userId, userId))
		.get();
	const result = db
		.insert(stickies)
		.values({
			userId,
			color,
			content: '',
			position: (top?.p ?? 0) - 1,
			createdAt: now,
			updatedAt: now
		})
		.run();
	return Number(result.lastInsertRowid);
}

export function updateSticky(
	userId: number,
	id: number,
	patch: { content?: string; color?: string }
): boolean {
	const set: { content?: string; color?: StickyColor; updatedAt: string } = {
		updatedAt: new Date().toISOString()
	};
	if (typeof patch.content === 'string') set.content = sanitizeStickyHtml(patch.content);
	if (patch.color !== undefined) {
		if (!isStickyColor(patch.color)) return false;
		set.color = patch.color;
	}
	const res = db
		.update(stickies)
		.set(set)
		.where(and(eq(stickies.id, id), eq(stickies.userId, userId)))
		.run();
	return res.changes > 0;
}

export function deleteSticky(userId: number, id: number) {
	db.delete(stickies)
		.where(and(eq(stickies.id, id), eq(stickies.userId, userId)))
		.run();
}

/** Persist a manual order: each id gets its index as position (scoped to the user). */
export function reorderStickies(userId: number, orderedIds: number[]) {
	const stmt = raw.prepare('UPDATE stickies SET position = ? WHERE id = ? AND user_id = ?');
	raw.transaction(() => {
		orderedIds.forEach((id, i) => stmt.run(i, id, userId));
	})();
}
