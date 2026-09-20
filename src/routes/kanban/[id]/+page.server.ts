import { error, fail, redirect, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { setFlash } from '$lib/server/flash';
import {
	addChecklistItem,
	archiveTask,
	deleteChecklistItem,
	deleteTask,
	getTask,
	toggleChecklistItem,
	updateTask,
	type TaskPriority
} from '$lib/server/kanban';
import { getSpend, listSpends } from '$lib/server/spends';
import { listAllTags } from '$lib/server/items';

const VALID_PRIORITY = new Set<TaskPriority>(['low', 'medium', 'high']);

export const load: PageServerLoad = async ({ locals, params }) => {
	const user = locals.user!;
	const id = Number(params.id);
	if (!Number.isFinite(id)) throw error(404, 'Tidak ditemukan');
	const task = getTask(user.id, id);
	if (!task) throw error(404, 'Tidak ditemukan');

	const spendOptions = listSpends({ userId: user.id, limit: 100 });
	if (task.spendId && !spendOptions.some((s) => s.id === task.spendId)) {
		const linked = getSpend(user.id, task.spendId);
		if (linked) spendOptions.unshift(linked);
	}

	return { task, spendOptions, tagsList: listAllTags() };
};

function parseDueDate(raw: string | null): string | null {
	if (!raw) return null;
	return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : null;
}

function parseTags(raw: string | null): string[] {
	if (!raw) return [];
	return raw
		.split(',')
		.map((t) => t.trim())
		.filter((t) => t.length > 0);
}

export const actions: Actions = {
	update: async ({ request, locals, params, cookies }) => {
		const user = locals.user!;
		const id = Number(params.id);
		if (!Number.isFinite(id)) throw error(404);
		const data = await request.formData();

		const title = String(data.get('title') ?? '').trim();
		if (!title) return fail(400, { error: 'Judul tidak boleh kosong.' });

		const priorityRaw = String(data.get('priority') ?? 'medium');
		const priority: TaskPriority = VALID_PRIORITY.has(priorityRaw as TaskPriority)
			? (priorityRaw as TaskPriority)
			: 'medium';

		const spendIdRaw = String(data.get('spend_id') ?? '');
		const spendId = spendIdRaw ? Number(spendIdRaw) : null;

		updateTask(user.id, id, {
			title,
			description: String(data.get('description') ?? '').trim() || null,
			priority,
			dueDate: parseDueDate(String(data.get('due_date') ?? '') || null),
			spendId: spendId && Number.isFinite(spendId) ? spendId : null,
			tags: parseTags(String(data.get('tags') ?? ''))
		});
		setFlash(cookies, 'success', 'Task diperbarui.');
		return { ok: true };
	},

	archive: async ({ locals, params, cookies }) => {
		const user = locals.user!;
		const id = Number(params.id);
		if (!Number.isFinite(id)) throw error(404);
		archiveTask(user.id, id);
		setFlash(cookies, 'success', 'Task diarsipkan.');
		throw redirect(303, '/kanban');
	},

	delete: async ({ locals, params, cookies }) => {
		const user = locals.user!;
		const id = Number(params.id);
		if (!Number.isFinite(id)) throw error(404);
		deleteTask(user.id, id);
		setFlash(cookies, 'success', 'Task dihapus.');
		throw redirect(303, '/kanban');
	},

	addChecklistItem: async ({ request, locals, params }) => {
		const user = locals.user!;
		const id = Number(params.id);
		if (!Number.isFinite(id)) throw error(404);
		const data = await request.formData();
		const content = String(data.get('content') ?? '').trim();
		if (!content) return fail(400, { error: 'Item checklist tidak boleh kosong.' });
		addChecklistItem(user.id, id, content);
		return { ok: true };
	},

	toggleChecklistItem: async ({ request, locals, params }) => {
		const user = locals.user!;
		const id = Number(params.id);
		if (!Number.isFinite(id)) throw error(404);
		const data = await request.formData();
		const itemId = Number(data.get('item_id'));
		if (!Number.isFinite(itemId)) return fail(400);
		toggleChecklistItem(user.id, id, itemId);
		return { ok: true };
	},

	deleteChecklistItem: async ({ request, locals, params }) => {
		const user = locals.user!;
		const id = Number(params.id);
		if (!Number.isFinite(id)) throw error(404);
		const data = await request.formData();
		const itemId = Number(data.get('item_id'));
		if (!Number.isFinite(itemId)) return fail(400);
		deleteChecklistItem(user.id, id, itemId);
		return { ok: true };
	}
};
