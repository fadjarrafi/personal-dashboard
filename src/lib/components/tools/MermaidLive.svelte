<!-- Render Mermaid secara live (debounce) + tombol unduh SVG. Dipakai Mermaid Renderer & DB Diagram. -->
<script lang="ts">
	import { mountMermaid } from '$lib/mermaid';
	import { Button } from '$lib/components/ui/button/index.js';
	import Download from '@lucide/svelte/icons/download';
	import { downloadBlob } from '$lib/tool-utils';

	let {
		source,
		filename = 'diagram.svg',
		height = 'h-[32rem]'
	}: { source: string; filename?: string; height?: string } = $props();

	let host = $state<HTMLDivElement>();
	let hasSvg = $state(false);

	$effect(() => {
		if (!host) return;
		const el = host;
		const src = source;
		let mounted: { destroy(): void } | null = null;
		let cancelled = false;
		const t = setTimeout(() => {
			mountMermaid(el, src).then((m) => {
				if (cancelled) return m.destroy();
				mounted = m;
				// pele merender async; cek keberadaan <svg> setelah frame berikutnya.
				requestAnimationFrame(() => (hasSvg = !!el.querySelector('svg')));
			});
		}, 300);
		return () => {
			cancelled = true;
			clearTimeout(t);
			mounted?.destroy();
		};
	});

	function download() {
		const svg = host?.querySelector('svg');
		if (!svg) return;
		const clone = svg.cloneNode(true) as SVGSVGElement;
		clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
		downloadBlob(
			new Blob([new XMLSerializer().serializeToString(clone)], { type: 'image/svg+xml' }),
			filename
		);
	}
</script>

<section class="min-w-0 space-y-2">
	<div class="flex min-h-7 items-center justify-between">
		<span class="label-mono">Diagram</span>
		<Button variant="ghost" size="xs" onclick={download} disabled={!hasSvg}><Download />SVG</Button>
	</div>
	<div
		class="mermaid-diagram bg-well {height} overflow-auto rounded-md border"
		bind:this={host}
	></div>
</section>
