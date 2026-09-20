import { and, eq, isNull } from 'drizzle-orm';
import { db, raw } from './db';
import { kanbanTasks } from './db/schema';

export type TaskStatus = 'todo' | 'in_progress' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface ChecklistItemRow {
	id: number;
	content: string;
	done: number;
	position: number;
}

export interface LinkedSpend {
	amount: number;
	merchant: string | null;
}

export interface TaskRow {
	id: number;
	title: string;
	description: string | null;
	status: TaskStatus;
	priority: TaskPriority;
	dueDate: string | null;
	position: number;
	spendId: number | null;
	createdAt: string;
	updatedAt: string;
	archivedAt: string | null;
	tags: string[];
	checklist: ChecklistItemRow[];
	spend: LinkedSpend | null;
}

type BaseRow = Omit<TaskRow, 'tags' | 'checklist' | 'spend'>;

function attachTagsAndChecklist(rows: BaseRow[]): TaskRow[] {
	if (rows.length === 0) return [];
	const ids = rows.map((r) => r.id);
	const placeholders = ids.map(() => '?').join(',');

	const spendIds = rows.map((r) => r.spendId).filter((id): id is number => id !== null);
	const spendById = new Map<number, LinkedSpend>();
	if (spendIds.length > 0) {
		const spendPlaceholders = spendIds.map(() => '?').join(',');
		const spendRows = raw
			.prepare(`SELECT id, amount, merchant FROM spends WHERE id IN (${spendPlaceholders})`)
			.all(...spendIds) as Array<{ id: number; amount: number; merchant: string | null }>;
		for (const s of spendRows) spendById.set(s.id, { amount: s.amount, merchant: s.merchant });
	}

	const tagRows = raw
		.prepare(
			`SELECT tt.task_id AS taskId, t.name AS name
			 FROM kanban_task_tags tt JOIN tags t ON t.id = tt.tag_id
			 WHERE tt.task_id IN (${placeholders})`
		)
		.all(...ids) as Array<{ taskId: number; name: string }>;
	const tagsByTask = new Map<number, string[]>();
	for (const { taskId, name } of tagRows) {
		if (!tagsByTask.has(taskId)) tagsByTask.set(taskId, []);
		tagsByTask.get(taskId)!.push(name);
	}

	const checklistRows = raw
		.prepare(
			`SELECT id, task_id AS taskId, content, done, position
			 FROM kanban_checklist_items
			 WHERE task_id IN (${placeholders})
			 ORDER BY position ASC, id ASC`
		)
		.all(...ids) as Array<{ id: number; taskId: number; content: string; done: number; position: number }>;
	const checklistByTask = new Map<number, ChecklistItemRow[]>();
	for (const { taskId, ...item } of checklistRows) {
		if (!checklistByTask.has(taskId)) checklistByTask.set(taskId, []);
		checklistByTask.get(taskId)!.push(item);
	}

	return rows.map((r) => ({
		...r,
		tags: tagsByTask.get(r.id) ?? [],
		checklist: checklistByTask.get(r.id) ?? [],
		spend: r.spendId !== null ? (spendById.get(r.spendId) ?? null) : null
	}));
}

export function listTasksGrouped(userId: number): Record<TaskStatus, TaskRow[]> {
	const rows = db
		.select()
		.from(kanbanTasks)
		.where(and(eq(kanbanTasks.userId, userId), isNull(kanbanTasks.archivedAt)))
		.orderBy(kanbanTasks.position)
		.all() as BaseRow[];

	const withExtras = attachTagsAndChecklist(rows);
	const grouped: Record<TaskStatus, TaskRow[]> = { todo: [], in_progress: [], done: [] };
	for (const row of withExtras) grouped[row.status].push(row);
	return grouped;
}

export function getTask(userId: number, id: number): TaskRow | null {
	const row = db
		.select()
		.from(kanbanTasks)
		.where(and(eq(kanbanTasks.id, id), eq(kanbanTasks.userId, userId)))
		.get() as BaseRow | undefined;
	if (!row) return null;
	return attachTagsAndChecklist([row])[0];
}

function nextPosition(userId: number, status: TaskStatus): number {
	const row = raw
		.prepare(
			`SELECT COALESCE(MAX(position), -1) + 1 AS next
			 FROM kanban_tasks WHERE user_id = ? AND status = ? AND archived_at IS NULL`
		)
		.get(userId, status) as { next: number };
	return row.next;
}

function normalizeText(v: string | null | undefined): string | null {
	if (v === null || v === undefined) return null;
	const t = v.trim();
	return t.length === 0 ? null : t;
}

function normalizeTags(input: string[] | undefined): string[] {
	if (!input) return [];
	return Array.from(
		new Set(input.map((t) => t.trim().toLowerCase()).filter((t) => t.length > 0 && t.length <= 40))
	);
}

function syncTags(taskId: number, names: string[]) {
	raw.prepare('DELETE FROM kanban_task_tags WHERE task_id = ?').run(taskId);
	if (names.length === 0) return;
	const insertTag = raw.prepare('INSERT OR IGNORE INTO tags (name) VALUES (?)');
	const selectTag = raw.prepare('SELECT id FROM tags WHERE name = ?');
	const linkTag = raw.prepare('INSERT OR IGNORE INTO kanban_task_tags (task_id, tag_id) VALUES (?, ?)');
	for (const name of names) {
		insertTag.run(name);
		const row = selectTag.get(name) as { id: number };
		linkTag.run(taskId, row.id);
	}
}

export interface UpsertTaskInput {
	title: string;
	description?: string | null;
	status?: TaskStatus;
	priority?: TaskPriority;
	dueDate?: string | null;
	spendId?: number | null;
	tags?: string[];
}

export function createTask(userId: number, input: UpsertTaskInput): number {
	const now = new Date().toISOString();
	const status = input.status ?? 'todo';
	const result = db
		.insert(kanbanTasks)
		.values({
			userId,
			title: input.title.trim(),
			description: normalizeText(input.description),
			status,
			priority: input.priority ?? 'medium',
			dueDate: normalizeText(input.dueDate),
			position: nextPosition(userId, status),
			spendId: input.spendId ?? null,
			createdAt: now,
			updatedAt: now
		})
		.run();
	const id = Number(result.lastInsertRowid);
	if (input.tags) syncTags(id, normalizeTags(input.tags));
	return id;
}

export function updateTask(userId: number, id: number, input: Partial<UpsertTaskInput>): boolean {
	const existing = getTask(userId, id);
	if (!existing) return false;
	db.update(kanbanTasks)
		.set({
			title: input.title !== undefined ? input.title.trim() : existing.title,
			description:
				input.description === undefined ? existing.description : normalizeText(input.description),
			priority: input.priority ?? existing.priority,
			dueDate: input.dueDate === undefined ? existing.dueDate : normalizeText(input.dueDate),
			spendId: input.spendId === undefined ? existing.spendId : input.spendId,
			updatedAt: new Date().toISOString()
		})
		.where(and(eq(kanbanTasks.id, id), eq(kanbanTasks.userId, userId)))
		.run();
	if (input.tags) syncTags(id, normalizeTags(input.tags));
	return true;
}

/**
 * Terapkan urutan baru satu kolom hasil drag-and-drop: setiap id di `orderedIds`
 * mendapat `status` kolom ini dan `position` = index-nya. Dipanggil sekali per
 * zone yang berubah (svelte-dnd-action memicu event finalize per zone), jadi
 * pemindahan lintas kolom = 2 panggilan (kolom asal + kolom tujuan).
 */
export function reorderColumn(userId: number, status: TaskStatus, orderedIds: number[]) {
	const update = raw.prepare(
		'UPDATE kanban_tasks SET status = ?, position = ?, updated_at = ? WHERE id = ? AND user_id = ?'
	);
	const now = new Date().toISOString();
	const tx = raw.transaction((ids: number[]) => {
		ids.forEach((id, index) => update.run(status, index, now, id, userId));
	});
	tx(orderedIds);
}

export function archiveTask(userId: number, id: number) {
	db.update(kanbanTasks)
		.set({ archivedAt: new Date().toISOString() })
		.where(and(eq(kanbanTasks.id, id), eq(kanbanTasks.userId, userId)))
		.run();
}

export function deleteTask(userId: number, id: number) {
	db.delete(kanbanTasks).where(and(eq(kanbanTasks.id, id), eq(kanbanTasks.userId, userId))).run();
}

export function addChecklistItem(userId: number, taskId: number, content: string): boolean {
	const task = getTask(userId, taskId);
	if (!task) return false;
	const trimmed = content.trim();
	if (!trimmed) return false;
	const position = task.checklist.length;
	raw
		.prepare(
			'INSERT INTO kanban_checklist_items (task_id, content, done, position, created_at) VALUES (?, ?, 0, ?, ?)'
		)
		.run(taskId, trimmed, position, new Date().toISOString());
	touchTask(userId, taskId);
	return true;
}

export function toggleChecklistItem(userId: number, taskId: number, itemId: number): boolean {
	const task = getTask(userId, taskId);
	if (!task) return false;
	const item = task.checklist.find((i) => i.id === itemId);
	if (!item) return false;
	raw
		.prepare('UPDATE kanban_checklist_items SET done = ? WHERE id = ? AND task_id = ?')
		.run(item.done ? 0 : 1, itemId, taskId);
	touchTask(userId, taskId);
	return true;
}

export function deleteChecklistItem(userId: number, taskId: number, itemId: number): boolean {
	const task = getTask(userId, taskId);
	if (!task) return false;
	raw.prepare('DELETE FROM kanban_checklist_items WHERE id = ? AND task_id = ?').run(itemId, taskId);
	touchTask(userId, taskId);
	return true;
}

function touchTask(userId: number, taskId: number) {
	db.update(kanbanTasks)
		.set({ updatedAt: new Date().toISOString() })
		.where(and(eq(kanbanTasks.id, taskId), eq(kanbanTasks.userId, userId)))
		.run();
}
