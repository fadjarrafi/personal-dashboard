<script lang="ts">
	import CopyButton from '$lib/components/CopyButton.svelte';
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
		if (r >= 3) return 'AA besar';
		return 'Gagal';
	}
</script>

{#snippet swatch(rgb: RGB, label: string)}
	{@const hex = toHex(rgb)}
	<button
		type="button"
		class="flex h-16 min-w-0 flex-1 flex-col items-start justify-end p-1.5 text-left font-mono text-[10px] leading-tight"
		style="background: {hex}; color: {readableOn(rgb)}"
		title="Klik untuk copy {hex}"
		onclick={() => navigator.clipboard?.writeText(hex)}
	>
		<span>{label}</span>
		<span class="opacity-80">{hex}</span>
	</button>
{/snippet}

<ToolHeader slug="color" />

<div class="space-y-8">
	<section class="space-y-3" aria-labelledby="shade-heading">
		<h2 id="shade-heading" class="label-mono">Skala shade</h2>
		<div class="flex flex-wrap items-end gap-3">
			<label class="form-control">
				<div class="label py-1"><span class="label-text text-xs">Warna dasar</span></div>
				<div class="flex items-center gap-2">
					<input
						type="color"
						class="h-11 w-11 cursor-pointer border border-base-300 bg-transparent"
						value={base ? toHex(base) : '#000000'}
						oninput={(e) => (hexInput = e.currentTarget.value)}
						aria-label="Pilih warna"
					/>
					<input
						class="input input-bordered w-32 font-mono {base ? '' : 'input-error'}"
						bind:value={hexInput}
						spellcheck="false"
						aria-label="Hex"
					/>
				</div>
			</label>
			<label class="form-control">
				<div class="label py-1"><span class="label-text text-xs">Nama token</span></div>
				<input class="input input-bordered w-32 font-mono" bind:value={name} spellcheck="false" />
			</label>
			{#if base}
				<code class="pb-3 font-mono text-xs opacity-70">{formatOklch(rgbToOklch(base))}</code>
			{/if}
		</div>

		{#if shades.length}
			<div class="grid grid-cols-6 gap-px border border-base-300 sm:grid-cols-11">
				{#each shades as s (s.step)}
					{@render swatch(s.rgb, String(s.step))}
				{/each}
			</div>

			<div class="space-y-2">
				<div class="flex flex-wrap items-center justify-between gap-2">
					<div class="join" role="group" aria-label="Format export">
						{#each [['css', 'CSS vars'], ['tailwind', 'Tailwind'], ['hex', 'Hex list']] as [value, label]}
							<button
								type="button"
								class="btn join-item btn-xs rounded-none {exportFormat === value
									? 'btn-active'
									: ''}"
								aria-pressed={exportFormat === value}
								onclick={() => (exportFormat = value as typeof exportFormat)}>{label}</button
							>
						{/each}
					</div>
					<CopyButton text={exportText} />
				</div>
				<pre
					class="max-h-64 overflow-auto border border-base-300 bg-black p-3 font-mono text-xs">{exportText}</pre>
			</div>
		{/if}
	</section>

	{#if base}
		<section class="space-y-3" aria-labelledby="harmony-heading">
			<h2 id="harmony-heading" class="label-mono">Harmoni (rotasi hue di OKLCH)</h2>
			<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
				{#each HARMONIES as hm (hm.name)}
					<div>
						<div class="mb-1 text-xs opacity-70">{hm.name}</div>
						<div class="flex gap-px border border-base-300">
							{#each hm.offsets as off}
								{@render swatch(rotateHue(base, off), off === 0 ? 'base' : `${off > 0 ? '+' : ''}${off}°`)}
							{/each}
						</div>
					</div>
				{/each}
			</div>
		</section>
	{/if}

	<section class="space-y-3" aria-labelledby="contrast-heading">
		<h2 id="contrast-heading" class="label-mono">Kontras WCAG</h2>
		<div class="flex flex-wrap items-end gap-3">
			<label class="form-control">
				<div class="label py-1"><span class="label-text text-xs">Teks</span></div>
				<input class="input input-bordered w-32 font-mono" bind:value={fg} spellcheck="false" />
			</label>
			<label class="form-control">
				<div class="label py-1"><span class="label-text text-xs">Latar</span></div>
				<input class="input input-bordered w-32 font-mono" bind:value={bg} spellcheck="false" />
			</label>
			<button
				type="button"
				class="btn-brutal-ghost btn-sm mb-1"
				onclick={() => ([fg, bg] = [bg, fg])}
				aria-label="Tukar warna teks dan latar">⇄</button
			>
			{#if base}
				<button type="button" class="btn-brutal-ghost btn-sm mb-1" onclick={() => (bg = toHex(base))}>
					Latar = warna dasar
				</button>
			{/if}
		</div>
		{#if contrast !== null}
			<div class="flex flex-wrap items-center gap-4">
				<div class="border border-base-300 px-4 py-3" style="background: {bg}; color: {fg}">
					<div class="text-lg font-semibold">Aa Contoh teks</div>
					<div class="text-sm">Teks body ukuran normal.</div>
				</div>
				<div>
					<div class="font-mono text-2xl">{contrast.toFixed(2)}:1</div>
					<div class="text-sm opacity-70">
						Normal: {grade(contrast)} · Besar: {contrast >= 4.5 ? 'AAA' : contrast >= 3 ? 'AA' : 'Gagal'}
					</div>
				</div>
			</div>
		{/if}
	</section>

	<section class="space-y-3" aria-labelledby="extract-heading">
		<h2 id="extract-heading" class="label-mono">Ekstrak palet dari gambar</h2>
		<div class="flex flex-wrap items-end gap-3">
			<input
				type="file"
				accept="image/*"
				class="file-input file-input-bordered w-full max-w-xs"
				onchange={onImage}
				aria-label="Pilih gambar"
			/>
			<label class="form-control w-40">
				<div class="label py-1"><span class="label-text text-xs">Jumlah warna: {k}</span></div>
				<input type="range" min="3" max="10" class="range range-sm" bind:value={k} onchange={runExtract} />
			</label>
		</div>
		{#if imageUrl}
			<div class="flex flex-wrap items-start gap-4">
				<img src={imageUrl} alt="Gambar sumber" class="max-h-48 max-w-full border border-base-300" />
				<ul class="min-w-0 flex-1 space-y-1" role="list">
					{#each extracted as e}
						{@const hex = toHex(e.rgb)}
						<li class="flex items-center gap-2 text-sm">
							<span class="h-6 w-10 border border-base-300" style="background: {hex}"></span>
							<code class="font-mono">{hex}</code>
							<span class="opacity-50">{(e.share * 100).toFixed(0)}%</span>
							<button type="button" class="btn btn-ghost btn-xs rounded-none" onclick={() => pick(e.rgb)}>
								Jadikan dasar
							</button>
						</li>
					{/each}
				</ul>
			</div>
		{/if}
	</section>
</div>
