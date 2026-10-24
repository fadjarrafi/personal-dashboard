<script lang="ts">
	import { mountMermaid } from '$lib/mermaid';
	import CodeBlock from './CodeBlock.svelte';

	let { code, maxHeight = '24rem' }: { code: string; maxHeight?: string } = $props();

	let view = $state<'diagram' | 'source'>('diagram');
	let host = $state<HTMLDivElement>();

	$effect(() => {
		if (!host) return;
		let cancelled = false;
		let mounted: { destroy(): void } | null = null;
		mountMermaid(host, code).then((m) => {
			if (cancelled) m.destroy();
			else mounted = m;
		});
		return () => {
			cancelled = true;
			mounted?.destroy();
		};
	});
</script>

<div class="flex gap-1 pb-1">
	<button
		type="button"
		class="btn btn-ghost btn-xs rounded-none {view === 'diagram' ? 'btn-active' : ''}"
		aria-pressed={view === 'diagram'}
		onclick={() => (view = 'diagram')}>Diagram</button
	>
	<button
		type="button"
		class="btn btn-ghost btn-xs rounded-none {view === 'source' ? 'btn-active' : ''}"
		aria-pressed={view === 'source'}
		onclick={() => (view = 'source')}>Source</button
	>
</div>

{#if view === 'diagram'}
	<div class="mermaid-diagram" style="max-height: {maxHeight}" bind:this={host}></div>
{:else}
	<CodeBlock {code} lang="mermaid" {maxHeight} />
{/if}
