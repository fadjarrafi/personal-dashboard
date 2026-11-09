<script lang="ts">
	import CopyButton from '$lib/components/CopyButton.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import Segmented from '$lib/components/tools/Segmented.svelte';
	import ArrowLeftRight from '@lucide/svelte/icons/arrow-left-right';
	import ToolHeader from '$lib/components/tools/ToolHeader.svelte';
	import {
		HARMONIES,
		contrastRatio,
		extractPalette,
		formatOklch,
		parseHex,
		readableOn,
		rotateHue,
		rgbToOklch,
		shadeScale,
		toHex,
		type RGB
	} from '$lib/color';

	let hexInput = $state('#3b82f6');
	let name = $state('brand');
	let exportFormat = $state<'css' | 'tailwind' | 'hex'>('css');

	const base = $derived(parseHex(hexInput));
	const shades = $derived(base ? shadeScale(base) : []);

	const exportText = $derived.by(() => {
		if (!shades.length) return '';
		const key = name.trim() || 'brand';
		if (exportFormat === 'hex') return shades.map((s) => toHex(s.rgb)).join('\n');
		if (exportFormat === 'css')
			return `:root {\n${shades.map((s) => `\t--${key}-${s.step}: ${toHex(s.rgb)};`).join('\n')}\n}`;
		return `${key}: {\n${shades.map((s) => `\t${s.step}: '${toHex(s.rgb)}',`).join('\n')}\n}`;
	});

	// --- Kontras ---
	let fg = $state('#ffffff');
	let bg = $state('#3b82f6');
	const contrast = $derived.by(() => {
		const a = parseHex(fg);
		const b = parseHex(bg);
		return a && b ? contrastRatio(a, b) : null;
	});

	// --- Ekstrak dari gambar ---
	let k = $state(6);
	let imageUrl = $state<string | null>(null);
	let extracted = $state<Array<{ rgb: RGB; share: number }>>([]);
	let lastImage: HTMLImageElement | null = null;

	function runExtract() {
		if (!lastImage) return;
		const scale = Math.min(1, 120 / Math.max(lastImage.naturalWidth, lastImage.naturalHeight));
		const w = Math.max(1, Math.round(lastImage.naturalWidth * scale));
		const h = Math.max(1, Math.round(lastImage.naturalHeight * scale));
		const canvas = document.createElement('canvas');
		canvas.width = w;
		canvas.height = h;
		const ctx = canvas.getContext('2d', { willReadFrequently: true });
		if (!ctx) return;
		ctx.drawImage(lastImage, 0, 0, w, h);
		extracted = extractPalette(ctx.getImageData(0, 0, w, h).data, k);
	}

	function onImage(e: Event) {
		const f = (e.currentTarget as HTMLInputElement).files?.[0];
		if (!f) return;
		if (imageUrl) URL.revokeObjectURL(imageUrl);
		imageUrl = URL.createObjectURL(f);
		const img = new Image();
		img.onload = () => {
			lastImage = img;
			runExtract();
		};
		img.src = imageUrl;
	}

	function pick(rgb: RGB) {
		hexInput = toHex(rgb);
		window.scrollTo({ top: 0, behavior: 'smooth' });
	}

	function grade(r: number) {
		if (r >= 7) return 'AAA';
		if (r >= 4.5) return 'AA';
		if (r >= 3) return 'AA large';
		return 'Fail';
	}
</script>

{#snippet swatch(rgb: RGB, label: string)}
	{@const hex = toHex(rgb)}
	<button
		type="button"
		class="flex h-16 min-w-0 flex-1 flex-col items-start justify-end p-1.5 text-left font-mono text-[10px] leading-tight"
		style="background: {hex}; color: {readableOn(rgb)}"
		title="Click to copy {hex}"
		onclick={() => navigator.clipboard?.writeText(hex)}
	>
		<span>{label}</span>
		<span class="opacity-80">{hex}</span>
	</button>
{/snippet}

<ToolHeader slug="color" />

<div class="space-y-8">
	<section class="space-y-3" aria-labelledby="shade-heading">
		<h2 id="shade-heading" class="label-mono">Shade scale</h2>
		<div class="flex flex-wrap items-end gap-3">
			<div class="grid gap-1.5">
				<Label for="color-hex" class="text-xs">Base color</Label>
				<div class="flex items-center gap-2">
					<input
						type="color"
						class="h-9 w-11 cursor-pointer rounded-md border bg-transparent"
						value={base ? toHex(base) : '#000000'}
						oninput={(e) => (hexInput = e.currentTarget.value)}
						aria-label="Pick color"
					/>
					<Input
						id="color-hex"
						class="w-32 font-mono"
						bind:value={hexInput}
						spellcheck="false"
						aria-invalid={base ? undefined : true}
					/>
				</div>
			</div>
			<div class="grid gap-1.5">
				<Label for="color-name" class="text-xs">Token name</Label>
				<Input id="color-name" class="w-32 font-mono" bind:value={name} spellcheck="false" />
			</div>
			{#if base}
				<code class="text-muted-foreground pb-2.5 font-mono text-xs"
					>{formatOklch(rgbToOklch(base))}</code
				>
			{/if}
		</div>

		{#if shades.length}
			<div class="grid grid-cols-6 gap-px overflow-hidden rounded-md border sm:grid-cols-11">
				{#each shades as s (s.step)}
					{@render swatch(s.rgb, String(s.step))}
				{/each}
			</div>

			<div class="space-y-2">
				<div class="flex flex-wrap items-center justify-between gap-2">
					<Segmented
						bind:value={exportFormat}
						options={[
							{ value: 'css', label: 'CSS vars' },
							{ value: 'tailwind', label: 'Tailwind' },
							{ value: 'hex', label: 'Hex list' }
						]}
						ariaLabel="Format export"
					/>
					<CopyButton text={exportText} />
				</div>
				<pre
					class="bg-well max-h-64 overflow-auto rounded-md border p-3 font-mono text-xs">{exportText}</pre>
			</div>
		{/if}
	</section>

	{#if base}
		<section class="space-y-3" aria-labelledby="harmony-heading">
			<h2 id="harmony-heading" class="label-mono">Harmonies (hue rotation in OKLCH)</h2>
			<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
				{#each HARMONIES as hm (hm.name)}
					<div>
						<div class="text-muted-foreground mb-1 text-xs">{hm.name}</div>
						<div class="flex gap-px overflow-hidden rounded-md border">
							{#each hm.offsets as off (off)}
								{@render swatch(
									rotateHue(base, off),
									off === 0 ? 'base' : `${off > 0 ? '+' : ''}${off}°`
								)}
							{/each}
						</div>
					</div>
				{/each}
			</div>
		</section>
	{/if}

	<section class="space-y-3" aria-labelledby="contrast-heading">
		<h2 id="contrast-heading" class="label-mono">WCAG contrast</h2>
		<div class="flex flex-wrap items-end gap-3">
			<div class="grid gap-1.5">
				<Label for="color-fg" class="text-xs">Text</Label>
				<Input id="color-fg" class="w-32 font-mono" bind:value={fg} spellcheck="false" />
			</div>
			<div class="grid gap-1.5">
				<Label for="color-bg" class="text-xs">Background</Label>
				<Input id="color-bg" class="w-32 font-mono" bind:value={bg} spellcheck="false" />
			</div>
			<Button
				variant="outline"
				size="icon"
				onclick={() => ([fg, bg] = [bg, fg])}
				aria-label="Swap text and background colors"><ArrowLeftRight /></Button
			>
			{#if base}
				<Button variant="outline" onclick={() => (bg = toHex(base))}>Background = base color</Button
				>
			{/if}
		</div>
		{#if contrast !== null}
			<div class="flex flex-wrap items-center gap-4">
				<div class="rounded-md border px-4 py-3" style="background: {bg}; color: {fg}">
					<div class="text-lg font-semibold">Aa Sample text</div>
					<div class="text-sm">Normal-size body text.</div>
				</div>
				<div>
					<div class="font-mono text-2xl tabular-nums">{contrast.toFixed(2)}:1</div>
					<div class="text-muted-foreground text-sm">
						Normal: {grade(contrast)} · Large: {contrast >= 4.5
							? 'AAA'
							: contrast >= 3
								? 'AA'
								: 'Fail'}
					</div>
				</div>
			</div>
		{/if}
	</section>

	<section class="space-y-3" aria-labelledby="extract-heading">
		<h2 id="extract-heading" class="label-mono">Extract palette from image</h2>
		<div class="flex flex-wrap items-end gap-3">
			<Input
				type="file"
				accept="image/*"
				class="w-full max-w-xs"
				onchange={onImage}
				aria-label="Choose image"
			/>
			<div class="grid w-40 gap-1.5">
				<Label for="color-k" class="text-xs">Colors: {k}</Label>
				<input
					id="color-k"
					type="range"
					min="3"
					max="10"
					class="accent-primary h-8 w-full cursor-pointer"
					bind:value={k}
					onchange={runExtract}
				/>
			</div>
		</div>
		{#if imageUrl}
			<div class="flex flex-wrap items-start gap-4">
				<img src={imageUrl} alt="Palette source" class="max-h-48 max-w-full rounded-md border" />
				<ul class="min-w-0 flex-1 space-y-1" role="list">
					{#each extracted as e, i (i)}
						{@const hex = toHex(e.rgb)}
						<li class="flex items-center gap-2 text-sm">
							<span class="h-6 w-10 rounded-sm border" style="background: {hex}"></span>
							<code class="font-mono">{hex}</code>
							<span class="text-muted-foreground">{(e.share * 100).toFixed(0)}%</span>
							<Button variant="ghost" size="xs" onclick={() => pick(e.rgb)}>Use as base</Button>
						</li>
					{/each}
				</ul>
			</div>
		{/if}
	</section>
</div>
