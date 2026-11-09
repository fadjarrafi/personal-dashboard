<script lang="ts">
	import { onMount } from 'svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
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
			return {
				date: new Date(isSeconds ? n * 1000 : n),
				unit: isSeconds ? 'seconds' : 'milliseconds'
			};
		}
		const d = new Date(s);
		return Number.isNaN(d.getTime()) ? { error: 'Unrecognized format.' } : { date: d, unit: null };
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
		const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
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
			['Unix (seconds)', String(Math.floor(ms / 1000))],
			['Unix (ms)', String(ms)],
			['ISO 8601 (UTC)', d.toISOString()],
			['WIB (Asia/Jakarta)', d.toLocaleString('en-GB', { timeZone: 'Asia/Jakarta' })],
			['Browser local', d.toString()],
			['Relative', relative(ms)]
		];
	});
</script>

<ToolHeader slug="time" />

<div class="space-y-4">
	<div class="bg-card flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg border p-4">
		<div>
			<div class="label-mono">Now (seconds)</div>
			<div class="font-mono text-lg tabular-nums">{Math.floor(now / 1000)}</div>
		</div>
		<div>
			<div class="label-mono">Now (ms)</div>
			<div class="font-mono text-lg tabular-nums">{now}</div>
		</div>
		<Button variant="outline" size="sm" onclick={() => (input = String(now))}>Use now</Button>
	</div>

	<div class="grid w-full max-w-xl gap-1.5">
		<div class="flex items-center justify-between">
			<Label for="time-input" class="label-mono">Epoch or date</Label>
			{#if parsed && !('error' in parsed) && parsed.unit}
				<span class="text-muted-foreground text-xs">read as {parsed.unit}</span>
			{/if}
		</div>
		<Input
			id="time-input"
			class="font-mono"
			bind:value={input}
			placeholder="1735689600 or 2025-01-01T00:00:00Z"
			spellcheck="false"
		/>
	</div>

	{#if parsed && 'error' in parsed}
		<p
			role="alert"
			class="border-destructive/40 text-destructive max-w-xl rounded-md border p-3 text-sm"
		>
			{parsed.error}
		</p>
	{:else if rows.length}
		<dl class="bg-card max-w-xl divide-y rounded-lg border">
			{#each rows as [label, value] (label)}
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
