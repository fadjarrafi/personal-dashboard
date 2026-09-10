import { fail, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { setFlash } from '$lib/server/flash';
import { addTask, listFolder, listTasks, syncTasksFromFile, toggleTask } from '$lib/server/vault';

export const load: PageServerLoad = async () => {
	syncTasksFromFile();
	const journal = listFolder('6. Journal', 10);
	const roadmap = listFolder('7. Roadmap', 20);
	const captures = listFolder('Dashboard Sync', 20).filter((n) => !n.path.endsWith('/Tasks.md'));
	const tasks = listTasks();
	return { journal, roadmap, captures, tasks };
};

export const actions: Actions = {
	toggleTask: async ({ request, cookies }) => {
		const data = await request.formData();
		const id = Number(data.get('id'));
		if (!Number.isFinite(id)) return fail(400, { error: 'ID tidak valid.' });
		toggleTask(id);
		setFlash(cookies, 'success', 'Tugas diperbarui.');
		return { ok: true };
	},

	addTask: async ({ request, cookies }) => {
		const data = await request.formData();
		const text = String(data.get('text') ?? '').trim();
		if (!text) return fail(400, { error: 'Tugas tidak boleh kosong.' });
		addTask(text);
		setFlash(cookies, 'success', 'Tugas ditambahkan.');
		return { ok: true };
	}
};
