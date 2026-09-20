import { error, fail, redirect, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { setFlash } from '$lib/server/flash';
import { archiveBoard, deleteBoard, getBoard, readScene, renameBoard } from '$lib/server/boards';

export const load: PageServerLoad = async ({ locals, params }) => {
	const user = locals.user!;
	const id = Number(params.id);
	if (!Number.isFinite(id)) throw error(404, 'Tidak ditemukan');
	const board = getBoard(user.id, id);
	if (!board) throw error(404, 'Tidak ditemukan');
	const scene = await readScene(user.id, id);
	return { board, scene };
};

export const actions: Actions = {
	rename: async ({ request, locals, params, cookies }) => {
		const user = locals.user!;
		const id = Number(params.id);
		if (!Number.isFinite(id)) throw error(404);
		const data = await request.formData();
		const title = String(data.get('title') ?? '').trim();
		if (!title) return fail(400, { error: 'Judul tidak boleh kosong.' });
		renameBoard(user.id, id, title);
		setFlash(cookies, 'success', 'Board diganti nama.');
		return { ok: true };
	},

	archive: async ({ locals, params, cookies }) => {
		const user = locals.user!;
		const id = Number(params.id);
		if (!Number.isFinite(id)) throw error(404);
		archiveBoard(user.id, id);
		setFlash(cookies, 'success', 'Board diarsipkan.');
		throw redirect(303, '/boards');
	},

	delete: async ({ locals, params, cookies }) => {
		const user = locals.user!;
		const id = Number(params.id);
		if (!Number.isFinite(id)) throw error(404);
		await deleteBoard(user.id, id);
		setFlash(cookies, 'success', 'Board dihapus.');
		throw redirect(303, '/boards');
	}
};
