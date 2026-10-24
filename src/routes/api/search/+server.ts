import { error, json, type RequestHandler } from '@sveltejs/kit';
import { listItems } from '$lib/server/items';

const LIMIT = 15;
const BODY_PREVIEW = 200;

// Pencarian ringan untuk command palette (Ctrl+K) — memakai FTS5 yang sama dengan halaman utama.
export const GET: RequestHandler = async ({ url, locals }) => {
	if (!locals.user) throw error(401, 'Unauthorized');
	const q = url.searchParams.get('q')?.trim() ?? '';
	if (q.length < 2) return json({ items: [] });

	const items = listItems({ userId: locals.user.id, q })
		.slice(0, LIMIT)
		.map((i) => ({
			id: i.id,
			type: i.type,
			title: i.title,
			url: i.url,
			language: i.language,
			// Snippet dikirim utuh supaya bisa langsung di-copy dari palette.
			body: i.type === 'snippet' ? i.body : (i.body?.slice(0, BODY_PREVIEW) ?? null)
		}));
	return json({ items });
};
