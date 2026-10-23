<script lang="ts">
	import { onMount } from 'svelte';
	import CopyButton from '$lib/components/CopyButton.svelte';
	import ToolHeader from '$lib/components/tools/ToolHeader.svelte';

	let now = $state(Date.now());
	let input = $state('');

	onMount(() => {
		input = String(Math.floor(Date.now() / 1000));
		const t = setInterval(() => (now = Date.now()), 1000);
		return () => clearInterval(t);
	});

	// Angka murni → epoch (≤ 11 digit dianggap detik, selebihnya milidetik);
	// selain itu → string tanggal yang dipahami Date (ISO, RFC 2822, dsb.).
	const parsed = $derived.by(() => {
		const s = input.trim();
		if (!s) return null;
		if (/^-?\d+(\.\d+)?$/.test(s)) {
			const n = Number(s);
			const isSeconds = Math.abs(n) < 1e11;
			return { date: new Date(isSeconds ? n * 1000 : n), unit: isSeconds ? 'detik' : 'milidetik' };
		}
		const d = new Date(s);
		return Number.isNaN(d.getTime()) ? { error: 'Format tidak dikenali.' } : { date: d, unit: null };
	});

	function relative(ms: number): string {
		const diff = ms - now;
		const abs = Math.abs(diff);
		const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
			['year', 31_536_000_000],
			['month', 2_592_000_000],
			['day', 86_400_000],
			['hour', 3_600_000],
			['minute', 60_000],
			['second', 1000]
		];
		const rtf = new Intl.RelativeTimeFormat('id-ID', { numeric: 'auto' });
		for (const [unit, size] of units) {
			if (abs >= size || unit === 'second') return rtf.format(Math.round(diff / size), unit);
		}
		return '';
	}

	const rows = $derived.by(() => {
		if (!parsed || 'error' in parsed) return [];
		const d = parsed.date;
		const ms = d.getTime();
		return [
			['Unix (detik)', String(Math.floor(ms / 1000))],
			['Unix (ms)', String(ms)],
			['ISO 8601 (UTC)', d.toISOString()],
			['WIB (Asia/Jakarta)', d.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })],
			['Lokal browser', d.toString()],
			['Relatif', relative(ms)]
		];
	});
</script>

<ToolHeader slug="time" />

<div class="space-y-4">
	<div class="blackboard flex flex-wrap items-center gap-x-6 gap-y-2 !p-4">
		<div>
			<div class="label-mono">Sekarang (detik)</div>
			<div class="font-mono text-lg">{Math.floor(now / 1000)}</div>
		</div>
		<div>
			<div class="label-mono">Sekarang (ms)</div>
			<div class="font-mono text-lg">{now}</div>
		</div>
		<button type="button" class="btn-brutal-ghost btn-sm" onclick={() => (input = String(now))}>
			Pakai sekarang
		</button>
	</div>

	<label class="form-control w-full max-w-xl">
		<div class="label py-1">
			<span class="label-mono">Epoch atau tanggal</span>
			{#if parsed && !('error' in parsed) && parsed.unit}
				<span class="label-text-alt opacity-60">terbaca sebagai {parsed.unit}</span>
			{/if}
		</div>
		<input
			class="input input-bordered w-full font-mono"
			bind:value={input}
			placeholder="1735689600 atau 2025-01-01T00:00:00Z"
			spellcheck="false"
		/>
	</label>

	{#if parsed && 'error' in parsed}
		<div role="alert" class="alert alert-error max-w-xl rounded-none text-sm">{parsed.error}</div>
	{:else if rows.length}
		<dl class="max-w-xl divide-y divide-base-300 border border-base-300">
			{#each rows as [label, value]}
				<div class="flex items-center justify-between gap-3 px-3 py-1.5">
					<dt class="label-mono shrink-0">{label}</dt>
					<dd class="flex min-w-0 items-center gap-1">
						<code class="truncate font-mono text-sm">{value}</code>
						<CopyButton text={value} />
					</dd>
				</div>
			{/each}
		</dl>
	{/if}
</div>
