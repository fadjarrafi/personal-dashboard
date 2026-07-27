import { error, fail, redirect, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { deleteItem, getItem, listAllTags, updateItem } from '$lib/server/items';

export const load: PageServerLoad = async ({ params, locals }) => {
	const id = Number(params.id);
	if (!Number.isFinite(id)) throw error(404, 'Tidak ditemukan');
	const item = getItem(locals.user!.id, id);
	if (!item) throw error(404, 'Tidak ditemukan');
	return { item, tags: listAllTags() };
};

export const actions: Actions = {
	update: async ({ request, params, locals }) => {
		const id = Number(params.id);
		const data = await request.formData();
		const title = String(data.get('title') ?? '').trim() || null;
		const body = String(data.get('body') ?? '').trim() || null;
		const url = String(data.get('url') ?? '').trim() || null;
		const language = String(data.get('language') ?? '').trim() || null;
		const pinned = data.get('pinned') === 'on';
		const tags = String(data.get('tags') ?? '')
			.split(',')
			.map((t) => t.trim())
			.filter(Boolean);

		const ok = updateItem(locals.user!.id, id, { title, body, url, language, pinned, tags });
		if (!ok) return fail(404, { error: 'Tidak ditemukan' });
		throw redirect(303, '/');
	},

	delete: async ({ params, locals }) => {
		const id = Number(params.id);
		deleteItem(locals.user!.id, id);
		throw redirect(303, '/');
	}
};
