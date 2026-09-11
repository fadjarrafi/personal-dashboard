import { error, fail, redirect, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { setFlash } from '$lib/server/flash';
import { listAllTags } from '$lib/server/items';
import {
	TASK_PRIORITIES,
	archiveTask,
	deleteTask,
	getTask,
	toggleDone,
	updateTask,
	type TaskPriority
} from '$lib/server/tasks';

export const load: PageServerLoad = async ({ locals, params }) => {
	const user = locals.user!;
	const id = Number(params.id);
	if (!Number.isFinite(id)) throw error(404, 'Tidak ditemukan');
	const task = getTask(user.id, id);
	if (!task) throw error(404, 'Tidak ditemukan');
	return { task, tags: listAllTags(), priorities: TASK_PRIORITIES };
};

function parseTags(raw: string | null): string[] {
	if (!raw) return [];
	return raw
		.split(',')
		.map((t) => t.trim())
		.filter(Boolean);
}

function parseDueDate(raw: string | null): string | null {
	if (!raw || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
	const d = new Date(`${raw}T00:00:00`);
	return isNaN(d.getTime()) ? null : d.toISOString();
}

export const actions: Actions = {
	update: async ({ request, locals, params, cookies }) => {
		const user = locals.user!;
		const id = Number(params.id);
		if (!Number.isFinite(id)) throw error(404);
		const data = await request.formData();

		const title = String(data.get('title') ?? '').trim();
		if (!title) return fail(400, { error: 'Judul tugas wajib diisi.' });

		const notes = String(data.get('notes') ?? '').trim() || null;
		const dueAt = parseDueDate(String(data.get('due_at') ?? '') || null);

		const priorityRaw = String(data.get('priority') ?? 'normal');
		const priority = (TASK_PRIORITIES as readonly string[]).includes(priorityRaw)
			? (priorityRaw as TaskPriority)
			: 'normal';

		const pinned = data.get('pinned') === 'on';
		const tags = parseTags(String(data.get('tags') ?? ''));

		updateTask(user.id, id, { title, notes, dueAt, priority, pinned, tags });
		setFlash(cookies, 'success', 'Tugas diperbarui.');
		throw redirect(303, '/tasks');
	},

	toggleDone: async ({ locals, params, cookies }) => {
		const user = locals.user!;
		const id = Number(params.id);
		if (!Number.isFinite(id)) throw error(404);
		toggleDone(user.id, id);
		setFlash(cookies, 'success', 'Status tugas diperbarui.');
		throw redirect(303, '/tasks');
	},

	archive: async ({ locals, params, cookies }) => {
		const user = locals.user!;
		const id = Number(params.id);
		if (!Number.isFinite(id)) throw error(404);
		archiveTask(user.id, id);
		setFlash(cookies, 'success', 'Tugas diarsipkan.');
		throw redirect(303, '/tasks');
	},

	delete: async ({ locals, params, cookies }) => {
		const user = locals.user!;
		const id = Number(params.id);
		if (!Number.isFinite(id)) throw error(404);
		deleteTask(user.id, id);
		setFlash(cookies, 'success', 'Tugas dihapus.');
		throw redirect(303, '/tasks');
	}
};
