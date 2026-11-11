import { fail, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { createSticky, deleteSticky, listStickies } from '$lib/server/stickies';
import { setFlash } from '$lib/server/flash';

export const load: PageServerLoad = async ({ locals }) => {
	return { stickies: listStickies(locals.user!.id) };
};

export const actions: Actions = {
	create: async ({ locals }) => {
		createSticky(locals.user!.id);
		return { ok: true };
	},

	delete: async ({ request, locals, cookies }) => {
		const data = await request.formData();
		const id = Number(data.get('id'));
		if (!Number.isFinite(id)) return fail(400, { error: 'Invalid ID.' });
		deleteSticky(locals.user!.id, id);
		setFlash(cookies, 'success', 'Sticky deleted.');
		return { ok: true };
	}
};
