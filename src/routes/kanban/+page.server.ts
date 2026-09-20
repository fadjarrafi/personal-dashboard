import { fail, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { setFlash } from '$lib/server/flash';
import { createTask, listTasksGrouped, type TaskStatus } from '$lib/server/kanban';
import { listAllTags } from '$lib/server/items';

const VALID_STATUS = new Set<TaskStatus>(['todo', 'in_progress', 'done']);

export const load: PageServerLoad = async ({ locals }) => {
	const user = locals.user!;
	const columns = listTasksGrouped(user.id);
	const tagsList = listAllTags();
	return { columns, tagsList };
};

export const actions: Actions = {
	create: async ({ request, locals, cookies }) => {
		const user = locals.user!;
		const data = await request.formData();
		const title = String(data.get('title') ?? '').trim();
		if (!title) {
			return fail(400, { error: 'Judul task tidak boleh kosong.' });
		}
		const statusRaw = String(data.get('status') ?? 'todo');
		const status: TaskStatus = VALID_STATUS.has(statusRaw as TaskStatus)
			? (statusRaw as TaskStatus)
			: 'todo';

		createTask(user.id, { title, status });
		setFlash(cookies, 'success', 'Task ditambahkan.');
		return { ok: true };
	}
};
