import { fail, redirect, type Actions } from '@sveltejs/kit';
import { setFlash } from '$lib/server/flash';
import { createNote } from '$lib/server/vault';

function parseTags(raw: string | null): string[] {
	if (!raw) return [];
	return raw
		.split(',')
		.map((t) => t.trim())
		.filter(Boolean);
}

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const data = await request.formData();
		const title = String(data.get('title') ?? '').trim();
		const body = String(data.get('body') ?? '').trim();
		const tags = parseTags(String(data.get('tags') ?? ''));

		if (!title) return fail(400, { error: 'Judul tidak boleh kosong.' });

		const path = createNote({ title, body, tags });
		setFlash(cookies, 'success', 'Note dibuat di vault.');
		throw redirect(303, `/vault/${path.split('/').map(encodeURIComponent).join('/')}`);
	}
};
