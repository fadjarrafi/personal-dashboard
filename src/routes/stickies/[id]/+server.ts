import { error, json, type RequestHandler } from '@sveltejs/kit';
import { updateSticky } from '$lib/server/stickies';

// Autosave dari kartu sticky: body JSON { content?: string, color?: string }.
export const PATCH: RequestHandler = async ({ request, locals, params }) => {
	if (!locals.user) throw error(401);
	const id = Number(params.id);
	if (!Number.isFinite(id)) throw error(404);

	let body: { content?: unknown; color?: unknown };
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Invalid JSON');
	}
	const patch: { content?: string; color?: string } = {};
	if (typeof body.content === 'string') patch.content = body.content;
	if (typeof body.color === 'string') patch.color = body.color;
	if (patch.content === undefined && patch.color === undefined)
		throw error(400, 'Nothing to update');

	if (!updateSticky(locals.user.id, id, patch)) throw error(404, 'Sticky not found');
	return json({ ok: true });
};
