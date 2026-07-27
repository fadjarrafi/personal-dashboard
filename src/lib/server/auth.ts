import { hash, verify } from '@node-rs/argon2';
import { eq } from 'drizzle-orm';
import { randomBytes } from 'node:crypto';
import type { Cookies } from '@sveltejs/kit';
import { db } from './db';
import { sessions, users } from './db/schema';

const SESSION_COOKIE = 'sid';
const SESSION_TTL_DAYS = 30;

export async function hashPassword(plain: string) {
	return hash(plain);
}

export async function verifyPassword(hashStr: string, plain: string) {
	return verify(hashStr, plain);
}

function newSessionId() {
	return randomBytes(32).toString('base64url');
}

function expiryDate(days = SESSION_TTL_DAYS) {
	const d = new Date();
	d.setDate(d.getDate() + days);
	return d;
}

export async function createSession(userId: number, cookies: Cookies) {
	const id = newSessionId();
	const expires = expiryDate();
	db.insert(sessions)
		.values({ id, userId, expiresAt: expires.toISOString() })
		.run();

	cookies.set(SESSION_COOKIE, id, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: process.env.NODE_ENV === 'production',
		expires
	});
	return id;
}

export async function resolveSession(cookies: Cookies) {
	const sid = cookies.get(SESSION_COOKIE);
	if (!sid) return { user: null, sessionId: null };

	const row = db
		.select({
			sessionId: sessions.id,
			expiresAt: sessions.expiresAt,
			userId: users.id,
			email: users.email
		})
		.from(sessions)
		.innerJoin(users, eq(users.id, sessions.userId))
		.where(eq(sessions.id, sid))
		.get();

	if (!row) {
		cookies.delete(SESSION_COOKIE, { path: '/' });
		return { user: null, sessionId: null };
	}

	if (new Date(row.expiresAt).getTime() < Date.now()) {
		db.delete(sessions).where(eq(sessions.id, sid)).run();
		cookies.delete(SESSION_COOKIE, { path: '/' });
		return { user: null, sessionId: null };
	}

	return {
		user: { id: row.userId, email: row.email },
		sessionId: row.sessionId
	};
}

export async function destroySession(sessionId: string, cookies: Cookies) {
	db.delete(sessions).where(eq(sessions.id, sessionId)).run();
	cookies.delete(SESSION_COOKIE, { path: '/' });
}
