<script lang="ts">
	// Halaman ini hanya dipakai sebagai endpoint POST dari Android share sheet
	// (lihat manifest.webmanifest -> share_target). Kalau user membuka URL ini
	// langsung lewat GET, tampilkan petunjuk singkat.
</script>

<div class="mx-auto mt-8 max-w-md text-center">
	<h1 class="text-lg font-semibold">Share a receipt to the Dashboard</h1>
	<p class="mt-2 text-sm opacity-70">
		Open a receipt in your e-wallet or mobile banking app, tap <em>Share</em>, then
		choose <strong>Personal Dashboard</strong>. You will then be taken to a preview form.
	</p>
	<a class="btn btn-primary mt-6" href="/spends">← Back to Spending</a>
</div>
