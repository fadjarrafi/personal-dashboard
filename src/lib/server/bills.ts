import { and, asc, eq, isNull } from 'drizzle-orm';
import { db } from './db';
import { bills } from './db/schema';

export const BILL_CATEGORIES = [
	'listrik',
	'internet',
	'cicilan',
	'langganan',
	'kartu_kredit',
	'lainnya'
] as const;
export type BillCategory = (typeof BILL_CATEGORIES)[number];

export const BILL_RECURRENCES = ['none', 'monthly', 'weekly', 'custom_days'] as const;
export type BillRecurrence = (typeof BILL_RECURRENCES)[number];

// Global default (bukan per-tagihan di v1) - lihat PRD §4.5.
export const REMINDER_DAYS_BEFORE = 3;

export type BillStatus = 'upcoming' | 'due_soon' | 'overdue';

export interface BillRow {
	id: number;
	title: string;
	amount: number;
	category: BillCategory;
	recurrence: BillRecurrence;
	intervalDays: number | null;
	nextDueAt: string;
	windowNotifiedAt: string | null;
	dueDayNotifiedAt: string | null;
	snoozedUntil: string | null;
	paidAt: string | null;
	archivedAt: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface BillWithStatus extends BillRow {
	status: BillStatus;
	daysUntilDue: number;
}

function todayLocalISODate(now: Date = new Date()): string {
	const y = now.getFullYear();
	const m = String(now.getMonth() + 1).padStart(2, '0');
	const d = String(now.getDate()).padStart(2, '0');
	return `${y}-${m}-${d}`;
}

function diffInDays(dateIso: string, today: string): number {
	const a = new Date(`${dateIso.slice(0, 10)}T00:00:00`);
	const b = new Date(`${today}T00:00:00`);
	return Math.round((a.getTime() - b.getTime()) / 86_400_000);
}

export function deriveStatus(
	bill: BillRow,
	today: string = todayLocalISODate(),
	reminderDaysBefore: number = REMINDER_DAYS_BEFORE
): { status: BillStatus; daysUntilDue: number } {
	const daysUntilDue = diffInDays(bill.nextDueAt, today);
	if (daysUntilDue < 0) return { status: 'overdue', daysUntilDue };
	if (daysUntilDue <= reminderDaysBefore) return { status: 'due_soon', daysUntilDue };
	return { status: 'upcoming', daysUntilDue };
}

function withStatus(bill: BillRow): BillWithStatus {
	const { status, daysUntilDue } = deriveStatus(bill);
	return { ...bill, status, daysUntilDue };
}

export function listBills(userId: number): BillWithStatus[] {
	const rows = db
		.select()
		.from(bills)
		.where(and(eq(bills.userId, userId), isNull(bills.archivedAt)))
		.orderBy(asc(bills.nextDueAt))
		.all() as BillRow[];
	return rows.map(withStatus);
}

export interface BillRowWithUser extends BillRow {
	userId: number;
}

/** Semua tagihan aktif lintas user, untuk skrip cron pengirim reminder. */
export function listActiveBillsForReminders(): BillRowWithUser[] {
	return db.select().from(bills).where(isNull(bills.archivedAt)).all() as BillRowWithUser[];
}

export function getBill(userId: number, id: number): BillRow | null {
	const row = db
		.select()
		.from(bills)
		.where(and(eq(bills.id, id), eq(bills.userId, userId)))
		.get();
	return (row as BillRow) ?? null;
}

export interface UpsertBillInput {
	title: string;
	amount: number;
	category: BillCategory;
	recurrence: BillRecurrence;
	intervalDays?: number | null;
	nextDueAt: string;
}

export function createBill(userId: number, input: UpsertBillInput): number {
	const now = new Date().toISOString();
	const result = db
		.insert(bills)
		.values({
			userId,
			title: input.title,
			amount: input.amount,
			category: input.category,
			recurrence: input.recurrence,
			intervalDays: input.recurrence === 'custom_days' ? (input.intervalDays ?? null) : null,
			nextDueAt: input.nextDueAt,
			createdAt: now,
			updatedAt: now
		})
		.run();
	return Number(result.lastInsertRowid);
}

export function updateBill(userId: number, id: number, input: Partial<UpsertBillInput>): boolean {
	const existing = getBill(userId, id);
	if (!existing) return false;
	const recurrence = input.recurrence ?? existing.recurrence;
	db.update(bills)
		.set({
			title: input.title ?? existing.title,
			amount: input.amount ?? existing.amount,
			category: input.category ?? existing.category,
			recurrence,
			intervalDays:
				recurrence === 'custom_days' ? (input.intervalDays ?? existing.intervalDays) : null,
			nextDueAt: input.nextDueAt ?? existing.nextDueAt,
			updatedAt: new Date().toISOString()
		})
		.where(and(eq(bills.id, id), eq(bills.userId, userId)))
		.run();
	return true;
}

export function deleteBill(userId: number, id: number) {
	db.delete(bills)
		.where(and(eq(bills.id, id), eq(bills.userId, userId)))
		.run();
}

/**
 * Geser tanggal jatuh tempo ke siklus berikutnya. `monthly` di-clamp ke
 * tanggal terakhir bulan tujuan (mis. 31 Jan -> 28/29 Feb), bukan meluber ke
 * bulan berikutnya seperti default JS Date.setMonth.
 */
export function addCycle(
	nextDueAt: string,
	recurrence: BillRecurrence,
	intervalDays: number | null
): string {
	const current = new Date(`${nextDueAt.slice(0, 10)}T00:00:00`);
	if (recurrence === 'weekly') {
		current.setDate(current.getDate() + 7);
		return current.toISOString();
	}
	if (recurrence === 'custom_days') {
		current.setDate(current.getDate() + (intervalDays ?? 30));
		return current.toISOString();
	}
	// monthly (dan fallback default)
	const day = current.getDate();
	const targetMonthFirst = new Date(current.getFullYear(), current.getMonth() + 1, 1);
	const lastDayOfTargetMonth = new Date(
		targetMonthFirst.getFullYear(),
		targetMonthFirst.getMonth() + 1,
		0
	).getDate();
	targetMonthFirst.setDate(Math.min(day, lastDayOfTargetMonth));
	return targetMonthFirst.toISOString();
}

/**
 * Tandai lunas siklus berjalan. Untuk recurrence='none' ini mengarsipkan
 * baris; untuk tagihan berulang ini menggeser next_due_at dan mereset
 * penanda notifikasi/snooze supaya siklus baru mulai bersih. Tidak pernah
 * membuat baris `spends` - keputusan tetap, lihat PRD §2.
 */
export function markPaid(userId: number, id: number): boolean {
	const existing = getBill(userId, id);
	if (!existing) return false;
	const now = new Date().toISOString();

	if (existing.recurrence === 'none') {
		db.update(bills)
			.set({ paidAt: now, archivedAt: now, updatedAt: now })
			.where(and(eq(bills.id, id), eq(bills.userId, userId)))
			.run();
		return true;
	}

	const nextDueAt = addCycle(existing.nextDueAt, existing.recurrence, existing.intervalDays);
	db.update(bills)
		.set({
			nextDueAt,
			windowNotifiedAt: null,
			dueDayNotifiedAt: null,
			snoozedUntil: null,
			updatedAt: now
		})
		.where(and(eq(bills.id, id), eq(bills.userId, userId)))
		.run();
	return true;
}

/**
 * Tunda reminder tanpa mengubah tanggal jatuh tempo - hanya menunda
 * pengiriman notifikasi berikutnya. Dipanggil dari UI maupun langsung dari
 * service worker saat aksi "Ingatkan besok" diklik.
 */
export function snoozeBill(userId: number, id: number, days: number = 1): boolean {
	const existing = getBill(userId, id);
	if (!existing) return false;
	const until = new Date();
	until.setDate(until.getDate() + Math.max(1, days));
	db.update(bills)
		.set({ snoozedUntil: until.toISOString(), updatedAt: new Date().toISOString() })
		.where(and(eq(bills.id, id), eq(bills.userId, userId)))
		.run();
	return true;
}

export function markNotified(
	userId: number,
	id: number,
	kind: 'window' | 'due_day',
	cycleNextDueAt: string
) {
	db.update(bills)
		.set(
			kind === 'window'
				? { windowNotifiedAt: cycleNextDueAt }
				: { dueDayNotifiedAt: cycleNextDueAt }
		)
		.where(and(eq(bills.id, id), eq(bills.userId, userId)))
		.run();
}
