<script lang="ts">
	import CopyButton from '$lib/components/CopyButton.svelte';
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
		<div class="join" role="group" aria-label="UUID version">
			{#each VERSIONS as v}
				<button
					type="button"
					class="btn join-item btn-sm rounded-none {version === v ? 'btn-active' : ''}"
					aria-pressed={version === v}
					onclick={() => (version = v)}>{v}</button
				>
			{/each}
		</div>
		<label class="form-control w-24">
			<div class="label py-1"><span class="label-text text-xs">Count</span></div>
			<input class="input input-bordered input-sm" type="number" min="1" max="500" bind:value={count} />
		</label>
		<label class="label cursor-pointer gap-2">
			<input type="checkbox" class="checkbox checkbox-sm" bind:checked={uppercase} />
			<span class="label-text text-xs">Uppercase</span>
		</label>
		<button type="button" class="btn-brutal btn-sm" onclick={generate}>Regenerate</button>
		<CopyButton text={joined} label="Copy all" class="btn-brutal-ghost btn-sm" />
	</div>

	<ul class="divide-y divide-base-300 border border-base-300" role="list">
		{#each ids as id, i (i + id)}
			<li class="flex items-center justify-between gap-2 px-3 py-1">
				<code class="break-all font-mono text-xs sm:text-sm">{id}</code>
				<CopyButton text={id} />
			</li>
		{/each}
	</ul>
</div>
