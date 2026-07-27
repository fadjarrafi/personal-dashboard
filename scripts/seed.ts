/**
 * Buat user pertama (single-user MVP).
 * Jalankan: pnpm db:seed -- <email> <password>
 *          npm run db:seed -- <email> <password>
 */
import { hash } from '@node-rs/argon2';
import { db } from '../src/lib/server/db';
import { users } from '../src/lib/server/db/schema';

const [, , emailArg, passwordArg] = process.argv;
if (!emailArg || !passwordArg) {
	console.error('Usage: db:seed -- <email> <password>');
	process.exit(1);
}

const email = emailArg.trim().toLowerCase();
const passwordHash = await hash(passwordArg);

try {
	const res = db.insert(users).values({ email, password: passwordHash }).run();
	console.log(`Created user #${res.lastInsertRowid} <${email}>`);
} catch (err) {
	const msg = err instanceof Error ? err.message : String(err);
	if (msg.includes('UNIQUE')) {
		console.error(`User with email ${email} already exists.`);
		process.exit(1);
	}
	throw err;
}
