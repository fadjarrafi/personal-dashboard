<script lang="ts">
	import CopyButton from '$lib/components/CopyButton.svelte';
	import Segmented from '$lib/components/tools/Segmented.svelte';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Checkbox } from '$lib/components/ui/checkbox/index.js';
	import RefreshCw from '@lucide/svelte/icons/refresh-cw';
	import ToolHeader from '$lib/components/tools/ToolHeader.svelte';

	const VERSIONS = ['v4', 'v7'] as const;

	let version = $state<(typeof VERSIONS)[number]>('v7');
	let count = $state(5);
	let uppercase = $state(false);
	let ids = $state<string[]>([]);

	function hex(bytes: Uint8Array): string {
		return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
	}

	// UUID v7 (RFC 9562): 48 bit unix ms + versi + 74 bit acak → urut berdasar waktu.
	function uuidv7(): string {
		const bytes = crypto.getRandomValues(new Uint8Array(16));
		const ms = Date.now();
		for (let i = 0; i < 6; i++) bytes[i] = Math.floor(ms / 2 ** (8 * (5 - i))) & 0xff;
		bytes[6] = (bytes[6] & 0x0f) | 0x70;
		bytes[8] = (bytes[8] & 0x3f) | 0x80;
		const h = hex(bytes);
		return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
	}

	function generate() {
		const n = Math.min(Math.max(Math.floor(count) || 1, 1), 500);
		const make = version === 'v4' ? () => crypto.randomUUID() : uuidv7;
		ids = Array.from({ length: n }, make).map((id) => (uppercase ? id.toUpperCase() : id));
	}

	$effect(() => {
		generate();
	});

	const joined = $derived(ids.join('\n'));
</script>

<ToolHeader slug="uuid" />

<div class="space-y-3">
	<div class="flex flex-wrap items-end gap-3">
		<Segmented bind:value={version} options={VERSIONS} ariaLabel="UUID version" />
		<div class="grid w-24 gap-1.5">
			<Label for="uuid-count" class="text-xs">Count</Label>
			<Input id="uuid-count" class="h-8" type="number" min="1" max="500" bind:value={count} />
		</div>
		<div class="flex h-8 items-center gap-2">
			<Checkbox id="uuid-upper" bind:checked={uppercase} />
			<Label for="uuid-upper" class="text-xs font-normal">Uppercase</Label>
		</div>
		<Button size="sm" onclick={generate}><RefreshCw />Regenerate</Button>
		<CopyButton text={joined} label="Copy all" variant="outline" size="sm" />
	</div>

	<ul class="bg-card divide-y rounded-lg border" role="list">
		{#each ids as id, i (i + id)}
			<li class="flex items-center justify-between gap-2 px-3 py-1">
				<code class="font-mono text-xs break-all sm:text-sm">{id}</code>
				<CopyButton text={id} />
			</li>
		{/each}
	</ul>
</div>
