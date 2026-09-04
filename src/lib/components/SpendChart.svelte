<script lang="ts">
	import { formatRupiah } from '$lib/format';

	interface DailyPoint {
		date: string; // YYYY-MM-DD
		total: number;
	}

	let {
		data,
		today
	}: {
		data: DailyPoint[];
		today: string; // YYYY-MM-DD
	} = $props();

	const max = $derived(Math.max(1, ...data.map((d) => d.total)));
	const avg = $derived(
		data.length === 0 ? 0 : Math.round(data.reduce((s, d) => s + d.total, 0) / data.length)
	);

	// Layout SVG dalam viewBox 100x40 unit → scale otomatis ke lebar container.
	const H = 40;
	const W = 100;
	const PAD_TOP = 3;
	const PAD_BOTTOM = 4;
	const PAD_X = 1;
	const chartH = $derived(H - PAD_TOP - PAD_BOTTOM);
	const barW = $derived((W - PAD_X * 2) / Math.max(1, data.length));
	const barGap = $derived(barW * 0.15);

	let hoverIdx = $state<number | null>(null);
	const active = $derived(hoverIdx !== null ? data[hoverIdx] : null);

	function labelDate(iso: string): string {
		const d = new Date(iso + 'T00:00:00');
		return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
	}

	function shortDay(iso: string): string {
		return String(Number(iso.slice(8, 10)));
	}

	// Tandai ticks di hari 1, 10, 20, dan hari terakhir.
	function isTick(iso: string, i: number, n: number): boolean {
		const day = Number(iso.slice(8, 10));
		if (i === 0 || i === n - 1) return true;
		return day === 10 || day === 20;
	}
</script>

<figure
	class="rounded-box border border-base-300 bg-base-200/40 p-3"
	aria-label="Grafik pengeluaran harian"
>
	<figcaption class="mb-2 flex items-baseline justify-between gap-2 text-xs">
		<span class="font-semibold uppercase tracking-wider opacity-60">Pengeluaran harian</span>
		<span class="opacity-70">
			{#if active}
				<span class="tabular-nums">{formatRupiah(active.total)}</span>
				<span class="ml-1 opacity-50">· {labelDate(active.date)}</span>
			{:else if avg > 0}
				<span class="opacity-60">rata-rata</span>
				<span class="tabular-nums">{formatRupiah(avg)}/hari</span>
			{/if}
		</span>
	</figcaption>

	<svg
		viewBox="0 0 {W} {H}"
		preserveAspectRatio="none"
		role="img"
		aria-label="Diagram batang pengeluaran per hari selama satu bulan"
		class="block h-32 w-full sm:h-40"
		onmouseleave={() => (hoverIdx = null)}
	>
		<!-- Baseline -->
		<line
			x1={PAD_X}
			y1={H - PAD_BOTTOM}
			x2={W - PAD_X}
			y2={H - PAD_BOTTOM}
			stroke="currentColor"
			stroke-width="0.15"
			opacity="0.2"
		/>

		<!-- Bar per hari -->
		{#each data as d, i (d.date)}
			{@const x = PAD_X + i * barW + barGap / 2}
			{@const w = Math.max(0.3, barW - barGap)}
			{@const h = d.total === 0 ? 0.4 : (d.total / max) * chartH}
			{@const y = H - PAD_BOTTOM - h}
			{@const isEmpty = d.total === 0}
			{@const isActive = hoverIdx === i}
			<rect
				{x}
				{y}
				width={w}
				height={h}
				rx="0.3"
				fill="currentColor"
				class={isActive ? 'text-primary' : isEmpty ? 'text-base-content/20' : 'text-primary/60'}
			/>
			<!-- Tap-friendly hitbox penuh tinggi -->
			<rect
				{x}
				y={PAD_TOP}
				width={w + barGap}
				height={chartH}
				fill="transparent"
				onmouseenter={() => (hoverIdx = i)}
				onclick={() => (hoverIdx = hoverIdx === i ? null : i)}
				role="presentation"
			>
				<title>{labelDate(d.date)}: {formatRupiah(d.total)}</title>
			</rect>
		{/each}

		<!-- Penanda hari ini: independen dari warna hover, supaya tidak ambigu saat
		     bar lain sedang di-hover (keduanya jadi full accent bersamaan). -->
		{#each data as d, i (d.date + '-today')}
			{#if d.date === today}
				{@const x = PAD_X + i * barW + barW / 2}
				<circle cx={x} cy={H - PAD_BOTTOM + 0.9} r="0.55" fill="currentColor" class="text-primary" />
			{/if}
		{/each}

		<!-- Label X (hari) -->
		{#each data as d, i (d.date + '-tick')}
			{#if isTick(d.date, i, data.length)}
				{@const x = PAD_X + i * barW + barW / 2}
				<text
					{x}
					y={H - 0.5}
					text-anchor="middle"
					fill="currentColor"
					opacity="0.5"
					font-size="2.4"
					class="font-mono"
				>
					{shortDay(d.date)}
				</text>
			{/if}
		{/each}
	</svg>

	{#if avg === 0}
		<div class="mt-2 text-center text-xs opacity-60">Belum ada pengeluaran bulan ini.</div>
	{/if}
</figure>
