import { and, desc, eq, gte, lt } from 'drizzle-orm';
import { db, raw } from './db';
import { spends } from './db/schema';

export { formatRupiah, parseRupiah } from '../format';

export interface SpendRow {
	id: number;
	amount: number;
	currency: string;
	category: string | null;
	merchant: string | null;
	note: string | null;
	method: string | null;
	refId: string | null;
	occurredAt: string;
	createdAt: string;
	updatedAt: string;
}

export interface ListSpendFilters {
	userId: number;
	from?: string;
	to?: string;
	category?: string;
	q?: string;
	limit?: number;
}

export function listSpends(filters: ListSpendFilters): SpendRow[] {
	const { userId, from, to, category, q, limit = 500 } = filters;
	const where = [eq(spends.userId, userId)];
	if (from) where.push(gte(spends.occurredAt, from));
	if (to) where.push(lt(spends.occurredAt, to));
	if (category) where.push(eq(spends.category, category));

	const rows = db
		.select()
		.from(spends)
		.where(and(...where))
		.orderBy(desc(spends.occurredAt), desc(spends.id))
		.limit(limit)
		.all() as SpendRow[];

	if (!q || q.trim().length === 0) return rows;
	const needle = q.trim().toLowerCase();
	return rows.filter((r) => {
		const hay = `${r.merchant ?? ''} ${r.note ?? ''} ${r.category ?? ''}`.toLowerCase();
		return hay.includes(needle);
	});
}

export function getSpend(userId: number, id: number): SpendRow | null {
	const row = db
		.select()
		.from(spends)
		.where(and(eq(spends.id, id), eq(spends.userId, userId)))
		.get();
	return (row as SpendRow) ?? null;
}

export interface UpsertSpendInput {
	amount: number;
	category?: string | null;
	merchant?: string | null;
	note?: string | null;
	method?: string | null;
	refId?: string | null;
	occurredAt: string;
	currency?: string;
}

function normalizeText(v: string | null | undefined): string | null {
	if (v === null || v === undefined) return null;
	const t = v.trim();
	return t.length === 0 ? null : t;
}

export function createSpend(userId: number, input: UpsertSpendInput): number {
	const now = new Date().toISOString();
	const result = db
		.insert(spends)
		.values({
			userId,
			amount: input.amount,
			currency: input.currency ?? 'IDR',
			category: normalizeText(input.category),
			merchant: normalizeText(input.merchant),
			note: normalizeText(input.note),
			method: normalizeText(input.method),
			refId: normalizeText(input.refId),
			occurredAt: input.occurredAt,
			createdAt: now,
			updatedAt: now
		})
		.run();
	return Number(result.lastInsertRowid);
}

export function updateSpend(
	userId: number,
	id: number,
	input: Partial<UpsertSpendInput>
): boolean {
	const existing = getSpend(userId, id);
	if (!existing) return false;
	db.update(spends)
		.set({
			amount: input.amount ?? existing.amount,
			currency: input.currency ?? existing.currency,
			category:
				input.category === undefined ? existing.category : normalizeText(input.category),
			merchant:
				input.merchant === undefined ? existing.merchant : normalizeText(input.merchant),
			note: input.note === undefined ? existing.note : normalizeText(input.note),
			method: input.method === undefined ? existing.method : normalizeText(input.method),
			refId: input.refId === undefined ? existing.refId : normalizeText(input.refId),
			occurredAt: input.occurredAt ?? existing.occurredAt,
			updatedAt: new Date().toISOString()
		})
		.where(and(eq(spends.id, id), eq(spends.userId, userId)))
		.run();
	return true;
}

export function deleteSpend(userId: number, id: number) {
	db.delete(spends).where(and(eq(spends.id, id), eq(spends.userId, userId))).run();
}

export interface SpendSummary {
	total: number;
	count: number;
	byCategory: Array<{ category: string; total: number; count: number }>;
	previousTotal: number;
}

export function getSummary(
	userId: number,
	from: string,
	to: string,
	previousFrom: string,
	previousTo: string
): SpendSummary {
	const totalRow = raw
		.prepare(
			`SELECT COALESCE(SUM(amount), 0) AS total, COUNT(*) AS count
			 FROM spends
			 WHERE user_id = ? AND occurred_at >= ? AND occurred_at < ?`
		)
		.get(userId, from, to) as { total: number; count: number };

	const prevRow = raw
		.prepare(
			`SELECT COALESCE(SUM(amount), 0) AS total
			 FROM spends
			 WHERE user_id = ? AND occurred_at >= ? AND occurred_at < ?`
		)
		.get(userId, previousFrom, previousTo) as { total: number };

	const byCategory = raw
		.prepare(
			`SELECT COALESCE(category, '(tanpa kategori)') AS category,
			        SUM(amount) AS total,
			        COUNT(*) AS count
			 FROM spends
			 WHERE user_id = ? AND occurred_at >= ? AND occurred_at < ?
			 GROUP BY COALESCE(category, '(tanpa kategori)')
			 ORDER BY total DESC`
		)
		.all(userId, from, to) as Array<{ category: string; total: number; count: number }>;

	return {
		total: totalRow.total,
		count: totalRow.count,
		byCategory,
		previousTotal: prevRow.total
	};
}

export function findSpendByRefId(userId: number, refId: string): SpendRow | null {
	const row = db
		.select()
		.from(spends)
		.where(and(eq(spends.userId, userId), eq(spends.refId, refId)))
		.get();
	return (row as SpendRow) ?? null;
}

/**
 * Kembalikan total per hari dalam rentang [from, to). Setiap hari yang ada di
 * rentang dipastikan hadir di hasil (nilai 0 kalau tidak ada transaksi) agar
 * grafik tidak melompat-lompat.
 */
export function getDailyTotals(
	userId: number,
	from: string,
	to: string
): Array<{ date: string; total: number }> {
	const rows = raw
		.prepare(
			`SELECT substr(occurred_at, 1, 10) AS date, SUM(amount) AS total
			 FROM spends
			 WHERE user_id = ? AND occurred_at >= ? AND occurred_at < ?
			 GROUP BY substr(occurred_at, 1, 10)`
		)
		.all(userId, from, to) as Array<{ date: string; total: number }>;

	const byDate = new Map(rows.map((r) => [r.date, r.total]));
	const start = new Date(from);
	const end = new Date(to);
	const result: Array<{ date: string; total: number }> = [];
	const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
	const stop = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));
	while (cursor < stop) {
		const key = cursor.toISOString().slice(0, 10);
		result.push({ date: key, total: byDate.get(key) ?? 0 });
		cursor.setUTCDate(cursor.getUTCDate() + 1);
	}
	return result;
}

export function listCategories(userId: number): string[] {
	const rows = db
		.selectDistinct({ category: spends.category })
		.from(spends)
		.where(eq(spends.userId, userId))
		.orderBy(spends.category)
		.all() as Array<{ category: string | null }>;
	return rows.map((r) => r.category).filter((c): c is string => c !== null && c.length > 0);
}

/**
 * Cakupan bulan berjalan (WIB / lokal server) dalam format ISO yang cocok
 * untuk kolom occurred_at (TEXT). Kembalikan awal-bulan-ini dan awal-bulan-depan.
 */
export function currentMonthRange(now: Date = new Date()): {
	from: string;
	to: string;
	prevFrom: string;
	prevTo: string;
} {
	const y = now.getFullYear();
	const m = now.getMonth();
	const from = new Date(y, m, 1).toISOString();
	const to = new Date(y, m + 1, 1).toISOString();
	const prevFrom = new Date(y, m - 1, 1).toISOString();
	const prevTo = from;
	return { from, to, prevFrom, prevTo };
}
