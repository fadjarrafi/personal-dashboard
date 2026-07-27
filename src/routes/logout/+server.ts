import { redirect, type RequestHandler } from '@sveltejs/kit';
import { destroySession } from '$lib/server/auth';

export const POST: RequestHandler = async ({ locals, cookies }) => {
	if (locals.sessionId) await destroySession(locals.sessionId, cookies);
	throw redirect(303, '/login');
};
