import { fail, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { setFlash } from '$lib/server/flash';
import { deleteItem, listItems, unarchiveItem } from '$lib/server/items';

export const load: PageServerLoad = async ({ locals }) => {
	const user = locals.user!;
	const items = listItems({ userId: user.id, onlyArchived: true });
	return { items };
};

export const actions: Actions = {
	unarchive: async ({ request, locals, cookies }) => {
		const user = locals.user!;
		const data = await request.formData();
		const id = Number(data.get('id'));
		if (!Number.isFinite(id)) return fail(400, { error: 'ID tidak valid.' });
		unarchiveItem(user.id, id);
		setFlash(cookies, 'success', 'Item dikembalikan.');
		return { ok: true };
	},

	delete: async ({ request, locals, cookies }) => {
		const user = locals.user!;
		const data = await request.formData();
		const id = Number(data.get('id'));
		if (!Number.isFinite(id)) return fail(400, { error: 'ID tidak valid.' });
		deleteItem(user.id, id);
		setFlash(cookies, 'success', 'Item dihapus permanen.');
		return { ok: true };
	}
};
