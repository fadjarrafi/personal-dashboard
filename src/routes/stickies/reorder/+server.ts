import { error, json, type RequestHandler } from '@sveltejs/kit';
import { reorderStickies } from '$lib/server/stickies';

// Body JSON { orderedIds: number[] } — urutan penuh setelah drag-and-drop.
export const PATCH: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) throw error(401, 'Unauthorized');

	let body: { orderedIds?: unknown };
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Invalid JSON');
	}
	const ids = body.orderedIds;
	if (!Array.isArray(ids) || !ids.every((id) => Number.isInteger(id))) {
		throw error(400, 'orderedIds must be an integer array');
	}

	reorderStickies(locals.user.id, ids as number[]);
	return json({ ok: true });
};
