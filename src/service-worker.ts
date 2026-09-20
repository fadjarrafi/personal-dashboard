/// <reference lib="webworker" />

// Service worker custom (strategi `injectManifest`, bukan `generateSW` bawaan
// vite-plugin-pwa) - satu-satunya cara menambahkan listener `push` dan
// `notificationclick` untuk bill reminder (docs/PRD-bill-reminder.md §2).
// SW ini masih meng-cache app shell seperti sebelumnya (PRD utama §2: SW
// hanya untuk shell caching, bukan offline data).

import { clientsClaim } from 'workbox-core';
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';

declare const self: ServiceWorkerGlobalScope;

// Hanya precache asset build (JS/CSS/ikon) - tidak ada navigateFallback.
// `generateSW` sebelumnya defaultnya mengaktifkan navigateFallback, tapi app
// ini SSR (adapter-node) dan online-first (PRD utama §2: "butuh koneksi
// internet", tidak ada offline capture); globPatterns yang ada juga tidak
// pernah mencakup HTML, jadi fallback semacam itu tidak punya entri precache
// yang valid untuk dituju. SW ini murni app-shell asset caching + push.
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();
self.skipWaiting();
clientsClaim();

interface BillPushData {
	title?: string;
	body?: string;
	url?: string;
	billId?: number;
}

self.addEventListener('push', (event: PushEvent) => {
	const data: BillPushData = event.data?.json() ?? {};
	event.waitUntil(
		self.registration.showNotification(data.title ?? 'Tagihan', {
			body: data.body,
			icon: '/icons/icon.svg',
			data: { url: data.url ?? '/bills', billId: data.billId },
			actions: [{ action: 'snooze', title: 'Ingatkan besok' }]
		})
	);
});

self.addEventListener('notificationclick', (event: NotificationEvent) => {
	event.notification.close();
	const { url, billId } = (event.notification.data ?? {}) as BillPushData;

	if (event.action === 'snooze' && billId) {
		// Fetch same-origin dari SW ikut membawa cookie sesi, jadi lolos cek
		// CSRF manual di hooks.server.ts sama seperti POST same-origin lain.
		event.waitUntil(fetch(`/bills/${billId}?/snooze`, { method: 'POST' }));
		return;
	}

	event.waitUntil(
		self.clients.matchAll({ type: 'window' }).then((clientList) => {
			for (const client of clientList) {
				if (client.url.includes(url ?? '/bills') && 'focus' in client) {
					return client.focus();
				}
			}
			return self.clients.openWindow(url ?? '/bills');
		})
	);
});
