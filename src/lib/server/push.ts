import webpush from 'web-push';
import { and, eq } from 'drizzle-orm';
import { db } from './db';
import { pushSubscriptions } from './db/schema';

const publicKey = process.env.VAPID_PUBLIC_KEY ?? '';
const privateKey = process.env.VAPID_PRIVATE_KEY ?? '';
const subject = process.env.VAPID_SUBJECT ?? 'mailto:admin@example.com';

if (publicKey && privateKey) {
	webpush.setVapidDetails(subject, publicKey, privateKey);
}

export interface SubscriptionKeys {
	p256dh: string;
	auth: string;
}

export interface SubscriptionInput {
	endpoint: string;
	keys: SubscriptionKeys;
}

export interface PushSubscriptionRow {
	id: number;
	endpoint: string;
	p256dh: string;
	auth: string;
	deviceLabel: string | null;
	createdAt: string;
}

export function upsertSubscription(
	userId: number,
	input: SubscriptionInput,
	deviceLabel: string | null = null
) {
	const now = new Date().toISOString();
	db.insert(pushSubscriptions)
		.values({
			userId,
			endpoint: input.endpoint,
			p256dh: input.keys.p256dh,
			auth: input.keys.auth,
			deviceLabel,
			createdAt: now
		})
		.onConflictDoUpdate({
			target: pushSubscriptions.endpoint,
			set: { p256dh: input.keys.p256dh, auth: input.keys.auth, deviceLabel }
		})
		.run();
}

export function removeSubscription(userId: number, endpoint: string) {
	db.delete(pushSubscriptions)
		.where(and(eq(pushSubscriptions.userId, userId), eq(pushSubscriptions.endpoint, endpoint)))
		.run();
}

export function listSubscriptions(userId: number): PushSubscriptionRow[] {
	return db
		.select()
		.from(pushSubscriptions)
		.where(eq(pushSubscriptions.userId, userId))
		.all() as PushSubscriptionRow[];
}

export interface BillPushPayload {
	title: string;
	body: string;
	url: string;
	billId: number;
}

/**
 * Kirim ke semua device milik user. Kegagalan pada satu subscription tidak
 * boleh menghentikan pengiriman ke yang lain (NFR PRD §7). Subscription yang
 * sudah tidak valid (404/410) dibersihkan diam-diam.
 */
export async function sendToUser(userId: number, payload: BillPushPayload): Promise<void> {
	const subs = listSubscriptions(userId);
	await Promise.all(
		subs.map(async (sub) => {
			try {
				await webpush.sendNotification(
					{
						endpoint: sub.endpoint,
						keys: { p256dh: sub.p256dh, auth: sub.auth }
					},
					JSON.stringify(payload)
				);
			} catch (err) {
				const statusCode = (err as { statusCode?: number }).statusCode;
				if (statusCode === 404 || statusCode === 410) {
					removeSubscription(userId, sub.endpoint);
				} else {
					console.error(`push gagal untuk subscription ${sub.id}:`, err);
				}
			}
		})
	);
}
