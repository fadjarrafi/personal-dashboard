import { fail, redirect, type Actions } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { createSession, verifyPassword } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';

export const actions: Actions = {
	default: async ({ request, cookies, url }) => {
		const data = await request.formData();
		const email = String(data.get('email') ?? '').trim().toLowerCase();
		const password = String(data.get('password') ?? '');

		if (!email || !password) {
			return fail(400, { email, error: 'Email dan password wajib diisi.' });
		}

		const user = db.select().from(users).where(eq(users.email, email)).get();
		if (!user) {
			return fail(400, { email, error: 'Kredensial salah.' });
		}

		const ok = await verifyPassword(user.password, password);
		if (!ok) {
			return fail(400, { email, error: 'Kredensial salah.' });
		}

		await createSession(user.id, cookies);
		const next = url.searchParams.get('next') ?? '/';
		throw redirect(303, next.startsWith('/') ? next : '/');
	}
};
