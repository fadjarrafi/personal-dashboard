import { error, json, type RequestHandler } from '@sveltejs/kit';
import { writeScene } from '$lib/server/boards';

export const PATCH: RequestHandler = async ({ request, locals, params }) => {
	if (!locals.user) throw error(401);
	const id = Number(params.id);
	if (!Number.isFinite(id)) throw error(404);

	const body = await request.text();
	if (!body) throw error(400, 'Body cannot be empty');

	const ok = await writeScene(locals.user.id, id, body);
	if (!ok) throw error(400, 'Invalid scene or board not found');
	return json({ ok: true });
};
