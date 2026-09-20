import { and, asc, desc, eq, isNull, sql } from 'drizzle-orm';
import { db, raw } from './db';
import { tasks } from './db/schema';
import { todayLocalISODate, diffInDays } from './date';

export const TASK_PRIORITIES = ['low', 'normal', 'high'] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export type TaskStatus = 'done' | 'overdue' | 'due_soon' | 'upcoming' | 'no_due_date';

// Ambang sama seperti bills.REMINDER_DAYS_BEFORE - perhitungan proksimitas
// jatuh tempo yang secara konsep identik, tak ada alasan pakai ambang beda.
export const DUE_SOON_DAYS = 3;

export interface TaskRow {
	id: number;
	title: string;
	notes: string | null;
	dueAt: string | null;
	priority: TaskPriority;
	pinned: number;
	doneAt: string | null;
	archivedAt: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface TaskWithMeta extends TaskRow {
	status: TaskStatus;
	daysUntilDue: number | null;
	tags: string[];
}

export function deriveTaskStatus(
	task: TaskRow,
	today: string = todayLocalISODate(),
	dueSoonDays: number = DUE_SOON_DAYS
): { status: TaskStatus; daysUntilDue: number | null } {
	if (task.doneAt) return { status: 'done', daysUntilDue: null };
	if (!task.dueAt) return { status: 'no_due_date', daysUntilDue: null };
	const daysUntilDue = diffInDays(task.dueAt, today);
	if (daysUntilDue < 0) return { status: 'overdue', daysUntilDue };
	if (daysUntilDue <= dueSoonDays) return { status: 'due_soon', daysUntilDue };
	return { status: 'upcoming', daysUntilDue };
}

function withStatus(task: TaskRow): Omit<TaskWithMeta, 'tags'> {
	const { status, daysUntilDue } = deriveTaskStatus(task);
	return { ...task, status, daysUntilDue };
}

function attachTags(rows: Array<Omit<TaskWithMeta, 'tags'>>): TaskWithMeta[] {
	if (rows.length === 0) return [];
	const ids = rows.map((r) => r.id);
	const placeholders = ids.map(() => '?').join(',');
	const tagRows = raw
		.prepare(
			`SELECT tt.task_id AS taskId, t.name AS name
			 FROM task_tags tt JOIN tags t ON t.id = tt.tag_id
			 WHERE tt.task_id IN (${placeholders})`
		)
		.all(...ids) as Array<{ taskId: number; name: string }>;

	const byTask = new Map<number, string[]>();
	for (const { taskId, name } of tagRows) {
		if (!byTask.has(taskId)) byTask.set(taskId, []);
		byTask.get(taskId)!.push(name);
	}
	return rows.map((r) => ({ ...r, tags: byTask.get(r.id) ?? [] }));
}

function normalizeTags(input: string[] | undefined): string[] {
	if (!input) return [];
	return Array.from(
		new Set(input.map((t) => t.trim().toLowerCase()).filter((t) => t.length > 0 && t.length <= 40))
	);
}

function syncTags(taskId: number, names: string[]) {
	raw.prepare('DELETE FROM task_tags WHERE task_id = ?').run(taskId);
	if (names.length === 0) return;
	const insertTag = raw.prepare('INSERT OR IGNORE INTO tags (name) VALUES (?)');
	const selectTag = raw.prepare('SELECT id FROM tags WHERE name = ?');
	const linkTag = raw.prepare('INSERT OR IGNORE INTO task_tags (task_id, tag_id) VALUES (?, ?)');
	for (const name of names) {
		insertTag.run(name);
		const row = selectTag.get(name) as { id: number };
		linkTag.run(taskId, row.id);
	}
}

export interface ListTaskFilters {
	userId: number;
	includeDone?: boolean;
	tag?: string;
}

export function listTasks(filters: ListTaskFilters): TaskWithMeta[] {
	const { userId, includeDone = false, tag } = filters;
	const where = [eq(tasks.userId, userId), isNull(tasks.archivedAt)];
	if (!includeDone) where.push(isNull(tasks.doneAt));

	const rows = db
		.select()
		.from(tasks)
		.where(and(...where))
		.orderBy(desc(tasks.pinned), sql`${tasks.dueAt} IS NULL`, asc(tasks.dueAt))
		.all() as TaskRow[];

	const withTags = attachTags(rows.map(withStatus));
	return tag ? withTags.filter((r) => r.tags.includes(tag)) : withTags;
}

export function getTask(userId: number, id: number): TaskWithMeta | null {
	const row = db
		.select()
		.from(tasks)
		.where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
		.get() as TaskRow | undefined;
	if (!row) return null;
	return attachTags([withStatus(row)])[0];
}

export interface UpsertTaskInput {
	title: string;
	notes?: string | null;
	dueAt?: string | null;
	priority: TaskPriority;
	pinned?: boolean;
	tags?: string[];
}

export function createTask(userId: number, input: UpsertTaskInput): number {
	const now = new Date().toISOString();
	const result = db
		.insert(tasks)
		.values({
			userId,
			title: input.title,
			notes: input.notes ?? null,
			dueAt: input.dueAt ?? null,
			priority: input.priority,
			pinned: input.pinned ? 1 : 0,
			createdAt: now,
			updatedAt: now
		})
		.run();
	const id = Number(result.lastInsertRowid);
	syncTags(id, normalizeTags(input.tags));
	return id;
}

export function updateTask(userId: number, id: number, input: Partial<UpsertTaskInput>): boolean {
	const existing = getTask(userId, id);
	if (!existing) return false;
	db.update(tasks)
		.set({
			title: input.title ?? existing.title,
			notes: input.notes === undefined ? existing.notes : input.notes,
			dueAt: input.dueAt === undefined ? existing.dueAt : input.dueAt,
			priority: input.priority ?? existing.priority,
			pinned: input.pinned === undefined ? existing.pinned : input.pinned ? 1 : 0,
			updatedAt: new Date().toISOString()
		})
		.where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
		.run();
	if (input.tags) syncTags(id, normalizeTags(input.tags));
	return true;
}

export function toggleDone(userId: number, id: number): boolean {
	const existing = getTask(userId, id);
	if (!existing) return false;
	db.update(tasks)
		.set({
			doneAt: existing.doneAt ? null : new Date().toISOString(),
			updatedAt: new Date().toISOString()
		})
		.where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
		.run();
	return true;
}

export function togglePin(userId: number, id: number): boolean {
	const existing = getTask(userId, id);
	if (!existing) return false;
	db.update(tasks)
		.set({ pinned: existing.pinned ? 0 : 1, updatedAt: new Date().toISOString() })
		.where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
		.run();
	return true;
}

export function archiveTask(userId: number, id: number) {
	db.update(tasks)
		.set({ archivedAt: new Date().toISOString() })
		.where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
		.run();
}

export function unarchiveTask(userId: number, id: number) {
	db.update(tasks)
		.set({ archivedAt: null })
		.where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
		.run();
}

export function deleteTask(userId: number, id: number) {
	db.delete(tasks).where(and(eq(tasks.id, id), eq(tasks.userId, userId))).run();
}
