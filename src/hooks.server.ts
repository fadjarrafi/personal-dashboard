import { error, redirect, type Handle } from '@sveltejs/kit';
import { resolveSession } from '$lib/server/auth';

const PUBLIC_PATHS = new Set(['/login']);
const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Path yang dibolehkan menerima POST cross-origin karena tidak bisa memenuhi
 * SvelteKit CSRF check bawaan. Saat ini hanya endpoint Web Share Target Android
 * (POST multipart dari system share sheet). Rute ini tetap butuh sesi login
 * yang valid → resiko CSRF tetap minim: attacker harus tahu URL dan pengguna
 * sudah login di device yang sama.
 */
const CSRF_EXEMPT = new Set(['/spends/share']);

function isSameOrigin(originHeader: string | null, appOrigin: string): boolean {
	if (!originHeader) return false;
	try {
		return new URL(originHeader).origin === appOrigin;
	} catch {
		return false;
	}
}

export const handle: Handle = async ({ event, resolve }) => {
	const { user, sessionId } = await resolveSession(event.cookies);
	event.locals.user = user;
	event.locals.sessionId = sessionId;

	const path = event.url.pathname;

	// CSRF check manual (bawaan SvelteKit dimatikan di svelte.config.js agar
	// share_target Android jalan). Terapkan ke semua path kecuali yang exempt.
	if (MUTATING.has(event.request.method) && !CSRF_EXEMPT.has(path)) {
		const origin = event.request.headers.get('origin');
		if (!isSameOrigin(origin, event.url.origin)) {
			throw error(403, 'Cross-site POST form submissions are forbidden');
		}
	}

	const isPublic = PUBLIC_PATHS.has(path) || path.startsWith('/manifest') || path.startsWith('/icons');

	if (!user && !isPublic) {
		throw redirect(303, `/login?next=${encodeURIComponent(path)}`);
	}
	if (user && path === '/login') {
		throw redirect(303, '/');
	}

	return resolve(event);
};
