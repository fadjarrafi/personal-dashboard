<script lang="ts">
	import { formatRupiah } from '$lib/format';

	interface MonthlyPoint {
		month: string; // YYYY-MM
		total: number;
	}

	let {
		data,
		currentMonth
	}: {
		data: MonthlyPoint[];
		currentMonth: string; // YYYY-MM
	} = $props();

	const max = $derived(Math.max(1, ...data.map((d) => d.total)));
	const avg = $derived(
		data.length === 0 ? 0 : Math.round(data.reduce((s, d) => s + d.total, 0) / data.length)
	);

	// Layout SVG dalam viewBox 100x40 unit → scale otomatis ke lebar container.
	const H = 40;
	const W = 100;
	const PAD_TOP = 3;
	const PAD_BOTTOM = 5;
	const PAD_X = 1;
	const chartH = $derived(H - PAD_TOP - PAD_BOTTOM);
	const barW = $derived((W - PAD_X * 2) / Math.max(1, data.length));
	const barGap = $derived(barW * 0.25);

	let hoverIdx = $state<number | null>(null);
	const active = $derived(hoverIdx !== null ? data[hoverIdx] : null);

	function labelMonth(ym: string): string {
		const [y, m] = ym.split('-').map(Number);
		return new Date(y, m - 1, 1).toLocaleDateString('id-ID', { month: 'short', year: '2-digit' });
	}

	function shortMonth(ym: string): string {
		const [y, m] = ym.split('-').map(Number);
		return new Date(y, m - 1, 1).toLocaleDateString('id-ID', { month: 'short' });
	}
</script>

<figure
	class="rounded-box border border-base-300 bg-base-200/40 p-3"
	aria-label="Grafik pengeluaran bulanan"
>
	<figcaption class="mb-2 flex items-baseline justify-between gap-2 text-xs">
		<span class="font-semibold uppercase tracking-wider opacity-60">Pengeluaran bulanan</span>
		<span class="opacity-70">
			{#if active}
				<span class="tabular-nums">{formatRupiah(active.total)}</span>
				<span class="ml-1 opacity-50">· {labelMonth(active.month)}</span>
			{:else if avg > 0}
				<span class="opacity-60">rata-rata</span>
				<span class="tabular-nums">{formatRupiah(avg)}/bulan</span>
			{/if}
		</span>
	</figcaption>

	<svg
		viewBox="0 0 {W} {H}"
		preserveAspectRatio="none"
		role="img"
		aria-label="Diagram batang pengeluaran per bulan selama {data.length} bulan terakhir"
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

		<!-- Bar per bulan -->
		{#each data as d, i (d.month)}
			{@const x = PAD_X + i * barW + barGap / 2}
			{@const w = Math.max(0.3, barW - barGap)}
			{@const h = d.total === 0 ? 0.4 : (d.total / max) * chartH}
			{@const y = H - PAD_BOTTOM - h}
			{@const isCurrent = d.month === currentMonth}
			{@const isEmpty = d.total === 0}
			{@const isActive = hoverIdx === i}
			<rect
				{x}
				{y}
				width={w}
				height={h}
				rx="0.4"
				fill="currentColor"
				class={isActive
					? 'text-primary'
					: isCurrent
						? 'text-primary'
						: isEmpty
							? 'text-base-content/20'
							: 'text-primary/60'}
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
				<title>{labelMonth(d.month)}: {formatRupiah(d.total)}</title>
			</rect>
		{/each}

		<!-- Label X (bulan) -->
		{#each data as d, i (d.month + '-tick')}
			{@const x = PAD_X + i * barW + barW / 2}
			<text
				{x}
				y={H - 0.5}
				text-anchor="middle"
				fill="currentColor"
				opacity={d.month === currentMonth ? '0.9' : '0.5'}
				font-size="2.4"
				font-family="ui-monospace, monospace"
			>
				{shortMonth(d.month)}
			</text>
		{/each}
	</svg>

	{#if avg === 0}
		<div class="mt-2 text-center text-xs opacity-60">Belum ada pengeluaran.</div>
	{/if}
</figure>
