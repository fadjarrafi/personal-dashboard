<script lang="ts">
	// Halaman ini hanya dipakai sebagai endpoint POST dari Android share sheet
	// (lihat manifest.webmanifest -> share_target). Kalau user membuka URL ini
	// langsung lewat GET, tampilkan petunjuk singkat.
	import { Button } from '$lib/components/ui/button/index.js';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
</script>

<div class="mx-auto mt-8 max-w-md text-center">
	<h1 class="text-lg font-semibold">Share a receipt to the Dashboard</h1>
	<p class="text-muted-foreground mt-2 text-sm">
		Open a receipt in your e-wallet or mobile banking app, tap <em>Share</em>, then choose
		<strong class="text-foreground">Personal Dashboard</strong>. You will then be taken to a preview
		form.
	</p>
	<Button class="mt-6" href="/spends"><ArrowLeft />Back to Spending</Button>
</div>
