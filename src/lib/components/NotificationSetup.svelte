<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Spinner } from '$lib/components/ui/spinner/index.js';
	import Bell from '@lucide/svelte/icons/bell';
	import BellRing from '@lucide/svelte/icons/bell-ring';
	let { deviceCount }: { deviceCount: number } = $props();

	let status = $state<'idle' | 'working' | 'enabled' | 'unsupported' | 'denied' | 'error'>('idle');
	let errorMsg = $state('');

	function urlBase64ToUint8Array(base64: string): Uint8Array {
		const padding = '='.repeat((4 - (base64.length % 4)) % 4);
		const base64Safe = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
		const raw = atob(base64Safe);
		return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
	}

	async function enable() {
		if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
			status = 'unsupported';
			return;
		}
		status = 'working';
		try {
			const permission = await Notification.requestPermission();
			if (permission !== 'granted') {
				status = 'denied';
				return;
			}
			const registration = await navigator.serviceWorker.ready;
			const keyRes = await fetch('/api/push/vapid-public-key');
			const { key } = await keyRes.json();
			if (!key) throw new Error('VAPID public key is not configured on the server.');

			const subscription = await registration.pushManager.subscribe({
				userVisibleOnly: true,
				applicationServerKey: urlBase64ToUint8Array(key) as BufferSource
			});

			await fetch('/api/push/subscribe', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(subscription.toJSON())
			});
			status = 'enabled';
		} catch (err) {
			status = 'error';
			errorMsg = err instanceof Error ? err.message : 'Failed to enable notifications.';
		}
	}
</script>

<div class="space-y-2">
	{#if status === 'enabled'}
		<p class="text-success flex items-center gap-2 text-sm">
			<BellRing class="size-4" />Notifications are enabled on this device.
		</p>
	{:else}
		<Button
			variant="outline"
			size="sm"
			class="tap-target w-full"
			onclick={enable}
			disabled={status === 'working'}
		>
			{#if status === 'working'}<Spinner />Enabling…{:else}<Bell />Enable notifications{/if}
		</Button>
		{#if status === 'unsupported'}
			<p class="text-warning text-xs">This browser does not support Web Push.</p>
		{:else if status === 'denied'}
			<p class="text-warning text-xs">
				Notification permission denied. Allow it in your browser settings and try again.
			</p>
		{:else if status === 'error'}
			<p role="alert" class="text-destructive text-xs">{errorMsg}</p>
		{/if}
	{/if}
	<p class="text-muted-foreground px-1 text-xs">
		{deviceCount > 0 ? `${deviceCount} device(s) receiving reminders.` : 'No active devices yet.'}
	</p>
</div>
