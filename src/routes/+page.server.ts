import { fail, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { setFlash } from '$lib/server/flash';
import {
	archiveItem,
	createItem,
	deleteItem,
	getItem,
	listAllTags,
	listItems,
	togglePin,
	type ItemType
} from '$lib/server/items';

const TYPES = new Set<ItemType>(['bookmark', 'note', 'snippet']);

export const load: PageServerLoad = async ({ locals, url }) => {
	const user = locals.user!;
	const typeParam = url.searchParams.get('type');
	const tag = url.searchParams.get('tag') ?? undefined;
	const q = url.searchParams.get('q') ?? undefined;
	const type = typeParam && TYPES.has(typeParam as ItemType) ? (typeParam as ItemType) : undefined;

	const items = listItems({ userId: user.id, type, tag, q });
	const tags = listAllTags();

	return { items, tags, filters: { type: type ?? null, tag: tag ?? null, q: q ?? null } };
};

function parseTags(raw: string | null): string[] {
	if (!raw) return [];
	return raw.split(',').map((t) => t.trim()).filter(Boolean);
}

export const actions: Actions = {
	create: async ({ request, locals, cookies }) => {
		const user = locals.user!;
		const data = await request.formData();
		const typeRaw = String(data.get('type') ?? '');
		if (!TYPES.has(typeRaw as ItemType)) return fail(400, { error: 'Tipe tidak valid.' });
		const type = typeRaw as ItemType;

		const title = String(data.get('title') ?? '').trim() || null;
		const body = String(data.get('body') ?? '').trim() || null;
		const url = String(data.get('url') ?? '').trim() || null;
		const language = String(data.get('language') ?? '').trim() || null;
		const tags = parseTags(String(data.get('tags') ?? ''));

		if (type === 'bookmark' && !url) return fail(400, { error: 'Bookmark membutuhkan URL.' });
		if (type !== 'bookmark' && !body && !title)
			return fail(400, { error: 'Isi tidak boleh kosong.' });

		createItem(user.id, { type, title, body, url, language, tags });
		setFlash(cookies, 'success', `${type} disimpan.`);
		return { ok: true };
	},

	togglePin: async ({ request, locals, cookies }) => {
		const user = locals.user!;
		const data = await request.formData();
		const id = Number(data.get('id'));
		if (!Number.isFinite(id)) return { ok: false };
		const before = getItem(user.id, id);
		togglePin(user.id, id);
		setFlash(cookies, 'success', before?.pinned ? 'Pin dilepas.' : 'Di-pin ke atas.');
		return { ok: true };
	},

	archive: async ({ request, locals, cookies }) => {
		const user = locals.user!;
		const data = await request.formData();
		const id = Number(data.get('id'));
		if (Number.isFinite(id)) {
			archiveItem(user.id, id);
			setFlash(cookies, 'success', 'Item diarsipkan.');
		}
		return { ok: true };
	},

	delete: async ({ request, locals, cookies }) => {
		const user = locals.user!;
		const data = await request.formData();
		const id = Number(data.get('id'));
		if (Number.isFinite(id)) {
			deleteItem(user.id, id);
			setFlash(cookies, 'success', 'Item dihapus.');
		}
		return { ok: true };
	}
};
