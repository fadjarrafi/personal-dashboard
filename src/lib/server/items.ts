import { and, desc, eq, isNotNull, isNull } from 'drizzle-orm';
import { db, raw } from './db';
import { items, tags } from './db/schema';

export type ItemType = 'bookmark' | 'note' | 'snippet';

export interface ListFilters {
	userId: number;
	type?: ItemType;
	tag?: string;
	q?: string;
	includeArchived?: boolean;
	onlyArchived?: boolean;
}

export interface ItemRow {
	id: number;
	type: ItemType;
	title: string | null;
	body: string | null;
	url: string | null;
	language: string | null;
	pinned: number;
	createdAt: string;
	updatedAt: string;
	archivedAt: string | null;
	tags: string[];
}

function attachTags(rows: Array<Omit<ItemRow, 'tags'>>): ItemRow[] {
	if (rows.length === 0) return [];
	const ids = rows.map((r) => r.id);
	const placeholders = ids.map(() => '?').join(',');
	const tagRows = raw
		.prepare(
			`SELECT it.item_id AS itemId, t.name AS name
			 FROM item_tags it JOIN tags t ON t.id = it.tag_id
			 WHERE it.item_id IN (${placeholders})`
		)
		.all(...ids) as Array<{ itemId: number; name: string }>;

	const byItem = new Map<number, string[]>();
	for (const { itemId, name } of tagRows) {
		if (!byItem.has(itemId)) byItem.set(itemId, []);
		byItem.get(itemId)!.push(name);
	}
	return rows.map((r) => ({ ...r, tags: byItem.get(r.id) ?? [] }));
}

export function listItems(filters: ListFilters): ItemRow[] {
	const { userId, type, tag, q, includeArchived = false, onlyArchived = false } = filters;
	const archiveClause = onlyArchived
		? 'AND i.archived_at IS NOT NULL'
		: includeArchived
			? ''
			: 'AND i.archived_at IS NULL';

	if (q && q.trim().length > 0) {
		const safeQ = q.trim().replace(/"/g, '""');
		const ftsQuery = `"${safeQ}"*`;
		const rows = raw
			.prepare(
				`SELECT i.id, i.type, i.title, i.body, i.url, i.language, i.pinned,
				        i.created_at AS createdAt, i.updated_at AS updatedAt, i.archived_at AS archivedAt
				 FROM items_fts f
				 JOIN items i ON i.id = f.rowid
				 WHERE i.user_id = ?
				   AND f.items_fts MATCH ?
				   ${type ? 'AND i.type = ?' : ''}
				   ${archiveClause}
				 ORDER BY i.pinned DESC, bm25(items_fts) ASC
				 LIMIT 200`
			)
			.all(...([userId, ftsQuery, ...(type ? [type] : [])] as unknown[])) as Array<
			Omit<ItemRow, 'tags'>
		>;
		const withTags = attachTags(rows);
		return tag ? withTags.filter((r) => r.tags.includes(tag)) : withTags;
	}

	const where = [eq(items.userId, userId)];
	if (type) where.push(eq(items.type, type));
	if (onlyArchived) where.push(isNotNull(items.archivedAt));
	else if (!includeArchived) where.push(isNull(items.archivedAt));

	let base = db
		.select({
			id: items.id,
			type: items.type,
			title: items.title,
			body: items.body,
			url: items.url,
			language: items.language,
			pinned: items.pinned,
			createdAt: items.createdAt,
			updatedAt: items.updatedAt,
			archivedAt: items.archivedAt
		})
		.from(items)
		.where(and(...where))
		.orderBy(desc(items.pinned), desc(items.updatedAt))
		.limit(200)
		.all() as Array<Omit<ItemRow, 'tags' | 'type'> & { type: ItemType }>;

	const withTags = attachTags(base);
	return tag ? withTags.filter((r) => r.tags.includes(tag)) : withTags;
}

export function getItem(userId: number, id: number): ItemRow | null {
	const row = db
		.select()
		.from(items)
		.where(and(eq(items.id, id), eq(items.userId, userId)))
		.get();
	if (!row) return null;
	return attachTags([
		{
			id: row.id,
			type: row.type as ItemType,
			title: row.title,
			body: row.body,
			url: row.url,
			language: row.language,
			pinned: row.pinned,
			createdAt: row.createdAt,
			updatedAt: row.updatedAt,
			archivedAt: row.archivedAt
		}
	])[0];
}

export interface UpsertInput {
	type: ItemType;
	title?: string | null;
	body?: string | null;
	url?: string | null;
	language?: string | null;
	pinned?: boolean;
	tags?: string[];
}

function deriveNoteTitle(title: string | null | undefined, body: string | null | undefined): string | null {
	if (title && title.trim().length > 0) return title;
	if (!body) return null;
	const firstLine = body.split(/\r?\n/).find((l) => l.trim().length > 0);
	if (!firstLine) return null;
	const trimmed = firstLine.trim();
	return trimmed.length > 80 ? trimmed.slice(0, 80) + '…' : trimmed;
}

function normalizeTags(input: string[] | undefined): string[] {
	if (!input) return [];
	return Array.from(
		new Set(
			input
				.map((t) => t.trim().toLowerCase())
				.filter((t) => t.length > 0 && t.length <= 40)
		)
	);
}

function syncTags(itemId: number, names: string[]) {
	raw.prepare('DELETE FROM item_tags WHERE item_id = ?').run(itemId);
	if (names.length === 0) return;
	const insertTag = raw.prepare('INSERT OR IGNORE INTO tags (name) VALUES (?)');
	const selectTag = raw.prepare('SELECT id FROM tags WHERE name = ?');
	const linkTag = raw.prepare('INSERT OR IGNORE INTO item_tags (item_id, tag_id) VALUES (?, ?)');
	for (const name of names) {
		insertTag.run(name);
		const row = selectTag.get(name) as { id: number };
		linkTag.run(itemId, row.id);
	}
}

export function createItem(userId: number, input: UpsertInput): number {
	const now = new Date().toISOString();
	const title =
		input.type === 'note' ? deriveNoteTitle(input.title, input.body) : (input.title ?? null);
	const result = db
		.insert(items)
		.values({
			userId,
			type: input.type,
			title,
			body: input.body ?? null,
			url: input.url ?? null,
			language: input.language ?? null,
			pinned: input.pinned ? 1 : 0,
			createdAt: now,
			updatedAt: now
		})
		.run();
	const id = Number(result.lastInsertRowid);
	syncTags(id, normalizeTags(input.tags));
	return id;
}

export function updateItem(userId: number, id: number, input: Partial<UpsertInput>) {
	const existing = getItem(userId, id);
	if (!existing) return false;

	const nextBody = input.body ?? existing.body;
	const rawTitle = input.title ?? existing.title;
	const nextTitle =
		existing.type === 'note' ? deriveNoteTitle(rawTitle, nextBody) : rawTitle;

	db.update(items)
		.set({
			title: nextTitle,
			body: nextBody,
			url: input.url ?? existing.url,
			language: input.language ?? existing.language,
			pinned: input.pinned === undefined ? existing.pinned : input.pinned ? 1 : 0,
			updatedAt: new Date().toISOString()
		})
		.where(and(eq(items.id, id), eq(items.userId, userId)))
		.run();

	if (input.tags) syncTags(id, normalizeTags(input.tags));
	return true;
}

export function archiveItem(userId: number, id: number) {
	db.update(items)
		.set({ archivedAt: new Date().toISOString() })
		.where(and(eq(items.id, id), eq(items.userId, userId)))
		.run();
}

export function unarchiveItem(userId: number, id: number) {
	db.update(items)
		.set({ archivedAt: null })
		.where(and(eq(items.id, id), eq(items.userId, userId)))
		.run();
}

export function deleteItem(userId: number, id: number) {
	db.delete(items).where(and(eq(items.id, id), eq(items.userId, userId))).run();
}

export function togglePin(userId: number, id: number) {
	const existing = getItem(userId, id);
	if (!existing) return;
	db.update(items)
		.set({ pinned: existing.pinned ? 0 : 1, updatedAt: new Date().toISOString() })
		.where(and(eq(items.id, id), eq(items.userId, userId)))
		.run();
}

export function listAllTags(): string[] {
	return (
		db.select({ name: tags.name }).from(tags).orderBy(tags.name).all() as Array<{ name: string }>
	).map((r) => r.name);
}
