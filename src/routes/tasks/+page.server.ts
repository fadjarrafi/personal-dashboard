import { fail, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { setFlash } from '$lib/server/flash';
import { listAllTags } from '$lib/server/items';
import {
	TASK_PRIORITIES,
	createTask,
	listTasks,
	toggleDone,
	togglePin,
	type TaskPriority
} from '$lib/server/tasks';

export const load: PageServerLoad = async ({ locals, url }) => {
	const user = locals.user!;
	const includeDone = url.searchParams.get('done') === '1';
	const tag = url.searchParams.get('tag') || undefined;

	return {
		tasks: listTasks({ userId: user.id, includeDone, tag }),
		tags: listAllTags(),
		priorities: TASK_PRIORITIES,
		includeDone,
		tag: tag ?? null
	};
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
	create: async ({ request, locals, cookies }) => {
		const user = locals.user!;
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

		createTask(user.id, { title, notes, dueAt, priority, pinned, tags });
		setFlash(cookies, 'success', 'Tugas ditambahkan.');
		return { ok: true };
	},

	toggleDone: async ({ request, locals, cookies }) => {
		const user = locals.user!;
		const data = await request.formData();
		const id = Number(data.get('id'));
		if (!Number.isFinite(id)) return fail(400, { error: 'ID tidak valid.' });
		const ok = toggleDone(user.id, id);
		if (!ok) return fail(404, { error: 'Tidak ditemukan' });
		setFlash(cookies, 'success', 'Status tugas diperbarui.');
		return { ok: true };
	},

	togglePin: async ({ request, locals, cookies }) => {
		const user = locals.user!;
		const data = await request.formData();
		const id = Number(data.get('id'));
		if (!Number.isFinite(id)) return fail(400, { error: 'ID tidak valid.' });
		const ok = togglePin(user.id, id);
		if (!ok) return fail(404, { error: 'Tidak ditemukan' });
		setFlash(cookies, 'success', 'Pin diperbarui.');
		return { ok: true };
	}
};
