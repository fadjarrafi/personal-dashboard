import { redirect, type Handle } from '@sveltejs/kit';
import { resolveSession } from '$lib/server/auth';

const PUBLIC_PATHS = new Set(['/login']);

export const handle: Handle = async ({ event, resolve }) => {
	const { user, sessionId } = await resolveSession(event.cookies);
	event.locals.user = user;
	event.locals.sessionId = sessionId;

	const path = event.url.pathname;
	const isPublic = PUBLIC_PATHS.has(path) || path.startsWith('/manifest') || path.startsWith('/icons');

	if (!user && !isPublic) {
		throw redirect(303, `/login?next=${encodeURIComponent(path)}`);
	}
	if (user && path === '/login') {
		throw redirect(303, '/');
	}

	return resolve(event);
};
