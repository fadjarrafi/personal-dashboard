import { error, json, type RequestHandler } from '@sveltejs/kit';
import { removeSubscription, upsertSubscription } from '$lib/server/push';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) throw error(401);
	let body: { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Body tidak valid');
	}
	if (!body.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
		throw error(400, 'Subscription tidak lengkap');
	}
	upsertSubscription(locals.user.id, {
		endpoint: body.endpoint,
		keys: { p256dh: body.keys.p256dh, auth: body.keys.auth }
	});
	return json({ ok: true });
};

export const DELETE: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) throw error(401);
	let body: { endpoint?: string };
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Body tidak valid');
	}
	if (!body.endpoint) throw error(400, 'endpoint wajib diisi');
	removeSubscription(locals.user.id, body.endpoint);
	return json({ ok: true });
};
