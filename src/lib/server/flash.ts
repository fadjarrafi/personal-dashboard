import type { Cookies } from '@sveltejs/kit';

export type FlashKind = 'success' | 'error' | 'info';
export interface Flash {
	kind: FlashKind;
	msg: string;
}

const COOKIE = 'flash';

export function setFlash(cookies: Cookies, kind: FlashKind, msg: string) {
	cookies.set(COOKIE, JSON.stringify({ kind, msg }), {
		path: '/',
		httpOnly: false,
		sameSite: 'lax',
		maxAge: 10
	});
}

export function consumeFlash(cookies: Cookies): Flash | null {
	const raw = cookies.get(COOKIE);
	if (!raw) return null;
	cookies.delete(COOKIE, { path: '/' });
	try {
		const parsed = JSON.parse(raw);
		if (parsed && typeof parsed.msg === 'string' && typeof parsed.kind === 'string') {
			return parsed as Flash;
		}
	} catch {
		// ignore
	}
	return null;
}
