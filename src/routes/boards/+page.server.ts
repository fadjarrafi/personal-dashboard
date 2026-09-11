import { fail, redirect, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { setFlash } from '$lib/server/flash';
import { archiveBoard, createBoard, deleteBoard, listBoards } from '$lib/server/boards';

export const load: PageServerLoad = async ({ locals }) => {
	const user = locals.user!;
	return { boards: listBoards(user.id) };
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		const user = locals.user!;
		const data = await request.formData();
		const title = String(data.get('title') ?? '').trim() || 'Untitled board';
		const id = await createBoard(user.id, title);
		throw redirect(303, `/boards/${id}`);
	},

	archive: async ({ request, locals, cookies }) => {
		const user = locals.user!;
		const data = await request.formData();
		const id = Number(data.get('id'));
		if (!Number.isFinite(id)) return fail(400, { error: 'ID tidak valid.' });
		archiveBoard(user.id, id);
		setFlash(cookies, 'success', 'Board diarsipkan.');
		return { ok: true };
	},

	delete: async ({ request, locals, cookies }) => {
		const user = locals.user!;
		const data = await request.formData();
		const id = Number(data.get('id'));
		if (!Number.isFinite(id)) return fail(400, { error: 'ID tidak valid.' });
		await deleteBoard(user.id, id);
		setFlash(cookies, 'success', 'Board dihapus.');
		return { ok: true };
	}
};
