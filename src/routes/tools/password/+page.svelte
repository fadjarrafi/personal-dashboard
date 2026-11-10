<script lang="ts">
	import ToolHeader from '$lib/components/tools/ToolHeader.svelte';
	import CopyButton from '$lib/components/CopyButton.svelte';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Checkbox } from '$lib/components/ui/checkbox/index.js';
	import { Progress } from '$lib/components/ui/progress/index.js';
	import RefreshCw from '@lucide/svelte/icons/refresh-cw';
	import { randomInt } from '$lib/tool-utils';

	const SETS = {
		upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
		lower: 'abcdefghijklmnopqrstuvwxyz',
		digits: '0123456789',
		symbols: '!@#$%^&*()-_=+[]{};:,.<>/?~'
	};
	const AMBIGUOUS = /[O0oIl1|`'"{}[\]()/\\;:,.]/g;

	let length = $state(20);
	let count = $state(5);
	let use = $state({ upper: true, lower: true, digits: true, symbols: true });
	let avoidAmbiguous = $state(false);
	let passwords = $state<string[]>([]);

	const pools = $derived(
		(Object.keys(SETS) as (keyof typeof SETS)[])
			.filter((k) => use[k])
			.map((k) => (avoidAmbiguous ? SETS[k].replace(AMBIGUOUS, '') : SETS[k]))
			.filter(Boolean)
	);
	const alphabet = $derived(pools.join(''));
	const len = $derived(Math.min(Math.max(Math.floor(length) || 4, 4), 256));
	const entropy = $derived(alphabet ? len * Math.log2(alphabet.length) : 0);
	const strength = $derived(
		entropy < 40
			? ['Weak', 'text-destructive']
			: entropy < 64
				? ['Fair', 'text-warning']
				: entropy < 100
					? ['Strong', 'text-success']
					: ['Very strong', 'text-success']
	);

	// Jamin setidaknya satu karakter dari tiap set terpilih, lalu acak posisinya (Fisher–Yates).
	function one(): string {
		const chars = pools.map((p) => p[randomInt(p.length)]);
		while (chars.length < len) chars.push(alphabet[randomInt(alphabet.length)]);
		for (let i = chars.length - 1; i > 0; i--) {
			const j = randomInt(i + 1);
			[chars[i], chars[j]] = [chars[j], chars[i]];
		}
		return chars.slice(0, len).join('');
	}

	function generate() {
		if (!alphabet) {
			passwords = [];
			return;
		}
		const n = Math.min(Math.max(Math.floor(count) || 1, 1), 100);
		passwords = Array.from({ length: n }, one);
	}

	$effect(() => {
		void len;
		void alphabet;
		void count;
		generate();
	});
</script>

<ToolHeader slug="password" />

<div class="max-w-3xl space-y-4">
	<div class="flex flex-wrap items-end gap-4">
		<div class="grid gap-1.5">
			<Label for="pw-len" class="text-xs">Length: {len}</Label>
			<input
				id="pw-len"
				type="range"
				min="4"
				max="128"
				bind:value={length}
				class="accent-primary w-56"
			/>
		</div>
		<div class="grid w-24 gap-1.5">
			<Label for="pw-count" class="text-xs">Count</Label>
			<Input id="pw-count" class="h-8" type="number" min="1" max="100" bind:value={count} />
		</div>
		<Button size="sm" onclick={generate}><RefreshCw />Regenerate</Button>
	</div>

	<div class="flex flex-wrap gap-4">
		{#each [['upper', 'A–Z'], ['lower', 'a–z'], ['digits', '0–9'], ['symbols', '!@#$']] as const as [k, label] (k)}
			<div class="flex items-center gap-2">
				<Checkbox id="pw-{k}" bind:checked={use[k]} />
				<Label for="pw-{k}" class="text-xs font-normal">{label}</Label>
			</div>
		{/each}
		<div class="flex items-center gap-2">
			<Checkbox id="pw-amb" bind:checked={avoidAmbiguous} />
			<Label for="pw-amb" class="text-xs font-normal">Avoid ambiguous (O0Il1…)</Label>
		</div>
	</div>

	{#if alphabet}
		<div class="space-y-1">
			<div class="flex justify-between text-xs">
				<span class={strength[1]}>{strength[0]}</span>
				<span class="text-muted-foreground"
					>≈ {Math.round(entropy)} bits of entropy · {alphabet.length}-char alphabet</span
				>
			</div>
			<Progress value={Math.min(100, (entropy / 128) * 100)} max={100} />
		</div>
		<ul class="bg-card divide-y rounded-lg border" role="list">
			{#each passwords as p, i (i + p)}
				<li class="flex items-center justify-between gap-2 px-3 py-1.5">
					<code class="font-mono text-sm break-all">{p}</code>
					<CopyButton text={p} />
				</li>
			{/each}
		</ul>
		<CopyButton text={passwords.join('\n')} label="Copy all" variant="outline" size="sm" />
	{:else}
		<p class="text-destructive text-sm">Select at least one character set.</p>
	{/if}
	<p class="text-muted-foreground text-xs">
		Generated locally with crypto.getRandomValues (unbiased).
	</p>
</div>
