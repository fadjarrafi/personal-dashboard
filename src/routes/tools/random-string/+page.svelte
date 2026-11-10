<script lang="ts">
	import ToolHeader from '$lib/components/tools/ToolHeader.svelte';
	import CopyButton from '$lib/components/CopyButton.svelte';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { NativeSelect } from '$lib/components/ui/native-select/index.js';
	import RefreshCw from '@lucide/svelte/icons/refresh-cw';
	import { randomFrom } from '$lib/tool-utils';

	const PRESETS = {
		alnum: ['Alphanumeric', 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'],
		lower: ['Lowercase + digits', 'abcdefghijklmnopqrstuvwxyz0123456789'],
		hex: ['Hex', '0123456789abcdef'],
		base64url: [
			'Base64URL (nanoid)',
			'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'
		],
		numeric: ['Numeric', '0123456789'],
		crockford: ['Crockford Base32', '0123456789ABCDEFGHJKMNPQRSTVWXYZ'],
		letters: ['Letters only', 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'],
		custom: ['Custom…', '']
	} as const;
	type Preset = keyof typeof PRESETS;

	let preset = $state<Preset>('alnum');
	let custom = $state('ABC123!');
	let length = $state(32);
	let count = $state(10);
	let prefix = $state('');
	let separatorEvery = $state(0);
	let strings = $state<string[]>([]);

	const charset = $derived(
		preset === 'custom' ? [...new Set(custom)].join('') : PRESETS[preset][1]
	);
	const len = $derived(Math.min(Math.max(Math.floor(length) || 1, 1), 1024));
	const bits = $derived(charset ? len * Math.log2(charset.length) : 0);

	function group(s: string): string {
		const n = Math.floor(separatorEvery);
		return n > 0 ? s.match(new RegExp(`.{1,${n}}`, 'gu'))!.join('-') : s;
	}

	function generate() {
		if (!charset) return (strings = []);
		const n = Math.min(Math.max(Math.floor(count) || 1, 1), 1000);
		strings = Array.from({ length: n }, () => prefix + group(randomFrom(charset, len)));
	}

	$effect(() => {
		void charset;
		void len;
		void count;
		void prefix;
		void separatorEvery;
		generate();
	});
</script>

<ToolHeader slug="random-string" />

<div class="max-w-3xl space-y-4">
	<div class="flex flex-wrap items-end gap-3">
		<div class="grid gap-1.5">
			<Label for="rs-preset" class="text-xs">Charset</Label>
			<NativeSelect id="rs-preset" size="sm" bind:value={preset}>
				{#each Object.entries(PRESETS) as [k, [label]] (k)}<option value={k}>{label}</option>{/each}
			</NativeSelect>
		</div>
		{#if preset === 'custom'}
			<div class="grid gap-1.5">
				<Label for="rs-custom" class="text-xs">Characters</Label>
				<Input id="rs-custom" class="h-8 w-48 font-mono" bind:value={custom} />
			</div>
		{/if}
		<div class="grid w-24 gap-1.5">
			<Label for="rs-len" class="text-xs">Length</Label>
			<Input id="rs-len" class="h-8" type="number" min="1" max="1024" bind:value={length} />
		</div>
		<div class="grid w-24 gap-1.5">
			<Label for="rs-count" class="text-xs">Count</Label>
			<Input id="rs-count" class="h-8" type="number" min="1" max="1000" bind:value={count} />
		</div>
		<div class="grid w-28 gap-1.5">
			<Label for="rs-prefix" class="text-xs">Prefix</Label>
			<Input id="rs-prefix" class="h-8 font-mono" placeholder="sk_live_" bind:value={prefix} />
		</div>
		<div class="grid w-28 gap-1.5">
			<Label for="rs-group" class="text-xs">Dash every N</Label>
			<Input id="rs-group" class="h-8" type="number" min="0" max="64" bind:value={separatorEvery} />
		</div>
		<Button size="sm" onclick={generate}><RefreshCw />Regenerate</Button>
		<CopyButton text={strings.join('\n')} label="Copy all" variant="outline" size="sm" />
	</div>

	<p class="text-muted-foreground text-xs">
		{charset.length} unique characters · ≈ {Math.round(bits)} bits of randomness per string
	</p>

	<ul class="bg-card divide-y rounded-lg border" role="list">
		{#each strings as s, i (i + s)}
			<li class="flex items-center justify-between gap-2 px-3 py-1">
				<code class="font-mono text-xs break-all sm:text-sm">{s}</code>
				<CopyButton text={s} />
			</li>
		{/each}
	</ul>
</div>
