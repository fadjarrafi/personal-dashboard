<script lang="ts">
	import ToolHeader from '$lib/components/tools/ToolHeader.svelte';
	import Segmented from '$lib/components/tools/Segmented.svelte';
	import TextInput from '$lib/components/tools/TextInput.svelte';
	import Output from '$lib/components/tools/Output.svelte';
	import { Input } from '$lib/components/ui/input/index.js';
	import { bytesToBase64, fmtSize } from '$lib/tool-utils';

	let svg = $state(
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`
	);
	let encoding = $state<'url' | 'base64'>('url');
	let usage = $state<'background' | 'mask' | 'list' | 'uri'>('background');
	let color = $state('#22c55e');

	// Minifikasi ringan: buang komentar/whitespace antar tag; tambahkan xmlns bila hilang.
	const minified = $derived(
		svg
			.replace(/<!--[\s\S]*?-->/g, '')
			.replace(/<\?xml[^>]*\?>/g, '')
			.replace(/>\s+</g, '><')
			.replace(/\s{2,}/g, ' ')
			.trim()
			.replace(/^<svg(?![^>]*xmlns=)/, '<svg xmlns="http://www.w3.org/2000/svg"')
	);

	// URL-encoding minimal (gaya "mini-svg-data-uri"): hanya karakter yang wajib, kutip ganda → tunggal.
	function urlEncode(s: string): string {
		return s.replace(/"/g, "'").replace(/[\r\n%#()<>?[\\\]^`{|}]/g, encodeURIComponent);
	}

	const uri = $derived(
		!minified
			? ''
			: encoding === 'url'
				? `data:image/svg+xml,${urlEncode(minified)}`
				: `data:image/svg+xml;base64,${bytesToBase64(new TextEncoder().encode(minified))}`
	);

	// Mask: warna ikon diambil dari background-color, jadi currentColor di SVG tidak relevan.
	const css = $derived.by(() => {
		if (!uri) return '';
		const u = `url("${uri}")`;
		switch (usage) {
			case 'background':
				return `.icon {\n  background-image: ${u};\n  background-repeat: no-repeat;\n  background-position: center;\n  background-size: contain;\n}`;
			case 'mask':
				return `.icon {\n  width: 1.5rem;\n  height: 1.5rem;\n  background-color: currentColor;\n  -webkit-mask: ${u} center / contain no-repeat;\n  mask: ${u} center / contain no-repeat;\n}`;
			case 'list':
				return `ul.checks {\n  list-style-image: ${u};\n}`;
			case 'uri':
				return uri;
		}
	});

	const previewUri = $derived(
		usage === 'mask' ? uri : uri.replace(/currentColor/g, encodeURIComponent(color))
	);
</script>

<ToolHeader slug="svg-css" />

<div class="space-y-3">
	<div class="flex flex-wrap items-center gap-3">
		<Segmented
			bind:value={encoding}
			options={[
				{ value: 'url', label: 'URL-encoded' },
				{ value: 'base64', label: 'Base64' }
			]}
			ariaLabel="Encoding"
		/>
		<Segmented
			bind:value={usage}
			options={[
				{ value: 'background', label: 'background' },
				{ value: 'mask', label: 'mask' },
				{ value: 'list', label: 'list-style' },
				{ value: 'uri', label: 'Data URI' }
			]}
			ariaLabel="CSS usage"
		/>
	</div>
	<div class="grid gap-4 lg:grid-cols-2">
		<TextInput bind:value={svg} label="SVG" height="h-72" />
		<Output value={css} label="CSS" height="h-72" />
	</div>
	<div class="flex flex-wrap items-center gap-4">
		<span class="label-mono">Preview</span>
		{#if uri}
			{#if usage === 'mask'}
				<span
					class="inline-block size-12"
					style="background-color: {color}; mask: url(&quot;{uri}&quot;) center / contain no-repeat; -webkit-mask: url(&quot;{uri}&quot;) center / contain no-repeat;"
				></span>
			{:else}
				<img src={previewUri} alt="SVG preview" class="bg-well size-12 rounded border p-1" />
			{/if}
		{/if}
		<label class="flex items-center gap-2 text-xs">
			<Input type="color" class="h-8 w-12 p-1" bind:value={color} aria-label="Preview color" />
			color for currentColor
		</label>
		<span class="text-muted-foreground text-xs">
			SVG {fmtSize(new TextEncoder().encode(svg).length)} → URI {fmtSize(uri.length)}
		</span>
	</div>
</div>
