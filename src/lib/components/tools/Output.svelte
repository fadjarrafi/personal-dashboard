<!-- Panel output read-only standar untuk /tools/*: label, tombol copy, error atau <pre>. -->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import CopyButton from '$lib/components/CopyButton.svelte';

	let {
		value,
		label = 'Output',
		error = null,
		height = 'h-56',
		wrap = true,
		copy,
		actions
	}: {
		value: string;
		label?: string;
		error?: string | null;
		height?: string;
		wrap?: boolean;
		/** Teks yang disalin bila berbeda dari yang ditampilkan (mis. preview terpotong). */
		copy?: string;
		actions?: Snippet;
	} = $props();
</script>

<section class="min-w-0 space-y-2">
	<div class="flex min-h-7 items-center justify-between gap-2">
		<span class="label-mono">{label}</span>
		<div class="flex items-center gap-1">
			{@render actions?.()}
			<CopyButton text={error ? '' : (copy ?? value)} />
		</div>
	</div>
	{#if error}
		<p role="alert" class="border-destructive/40 text-destructive rounded-md border p-3 text-sm">
			{error}
		</p>
	{:else}
		<pre
			class="bg-well {height} overflow-auto rounded-md border p-3 font-mono text-xs {wrap
				? 'break-all whitespace-pre-wrap'
				: ''}">{value || '—'}</pre>
	{/if}
</section>
