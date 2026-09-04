<script lang="ts">
	let { deviceCount }: { deviceCount: number } = $props();

	let status = $state<'idle' | 'working' | 'enabled' | 'unsupported' | 'denied' | 'error'>(
		'idle'
	);
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
			if (!key) throw new Error('VAPID public key belum dikonfigurasi di server.');

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
			errorMsg = err instanceof Error ? err.message : 'Gagal mengaktifkan notifikasi.';
		}
	}
</script>

<div class="space-y-2">
	{#if status === 'enabled'}
		<div class="alert alert-success py-2 text-sm">Notifikasi aktif di device ini.</div>
	{:else}
		<button
			type="button"
			class="btn btn-outline btn-sm tap-target w-full"
			onclick={enable}
			disabled={status === 'working'}
		>
			{status === 'working' ? 'Mengaktifkan…' : 'Aktifkan notifikasi'}
		</button>
		{#if status === 'unsupported'}
			<div class="alert alert-warning py-2 text-xs">Browser ini tidak mendukung Web Push.</div>
		{:else if status === 'denied'}
			<div class="alert alert-warning py-2 text-xs">
				Izin notifikasi ditolak. Aktifkan lewat pengaturan browser lalu coba lagi.
			</div>
		{:else if status === 'error'}
			<div class="alert alert-error py-2 text-xs">{errorMsg}</div>
		{/if}
	{/if}
	<p class="px-1 text-xs opacity-60">
		{deviceCount > 0
			? `${deviceCount} device aktif menerima reminder.`
			: 'Belum ada device yang aktif.'}
	</p>
</div>
