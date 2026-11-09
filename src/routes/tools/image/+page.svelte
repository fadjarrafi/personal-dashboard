<script lang="ts">
	import { onDestroy } from 'svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { NativeSelect } from '$lib/components/ui/native-select/index.js';
	import { Spinner } from '$lib/components/ui/spinner/index.js';
	import Download from '@lucide/svelte/icons/download';
	import X from '@lucide/svelte/icons/x';
	import ImageUp from '@lucide/svelte/icons/image-up';
	import RefreshCw from '@lucide/svelte/icons/refresh-cw';
	import ToolHeader from '$lib/components/tools/ToolHeader.svelte';

	type OutFormat = 'same' | 'png' | 'jpeg' | 'webp';
	type Job = {
		id: number;
		file: File;
		srcUrl: string;
		status: 'pending' | 'working' | 'done' | 'error';
		out?: Blob;
		outUrl?: string;
		outName?: string;
		width?: number;
		height?: number;
		error?: string;
	};

	const MIME: Record<Exclude<OutFormat, 'same'>, string> = {
		png: 'image/png',
		jpeg: 'image/jpeg',
		webp: 'image/webp'
	};

	let format = $state<OutFormat>('same');
	let quality = $state(80); // JPEG/WebP, 1..100
	let colors = $state(256); // PNG, jumlah warna palet; 0 = lossless
	let maxWidth = $state<number | null>(null);
	let jobs = $state<Job[]>([]);
	let dragging = $state(false);
	let nextId = 0;

	function fmtSize(n: number) {
		if (n < 1024) return `${n} B`;
		if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`;
		return `${(n / 1024 ** 2).toFixed(2)} MB`;
	}

	function targetFormat(file: File): Exclude<OutFormat, 'same'> {
		if (format !== 'same') return format;
		if (file.type === 'image/jpeg') return 'jpeg';
		if (file.type === 'image/webp') return 'webp';
		return 'png';
	}

	function canvasToBlob(canvas: HTMLCanvasElement, type: string, q: number): Promise<Blob> {
		return new Promise((resolve, reject) =>
			canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Encoding failed'))), type, q)
		);
	}

	async function compress(job: Job) {
		job.status = 'working';
		try {
			const bitmap = await createImageBitmap(job.file);
			const scale = maxWidth && bitmap.width > maxWidth ? maxWidth / bitmap.width : 1;
			const w = Math.max(1, Math.round(bitmap.width * scale));
			const h = Math.max(1, Math.round(bitmap.height * scale));
			const canvas = document.createElement('canvas');
			canvas.width = w;
			canvas.height = h;
			const ctx = canvas.getContext('2d');
			if (!ctx) throw new Error('Canvas unavailable');
			const fmt = targetFormat(job.file);
			// JPEG tidak punya alpha: isi putih agar area transparan tidak jadi hitam.
			if (fmt === 'jpeg') {
				ctx.fillStyle = '#ffffff';
				ctx.fillRect(0, 0, w, h);
			}
			ctx.imageSmoothingQuality = 'high';
			ctx.drawImage(bitmap, 0, 0, w, h);
			bitmap.close();

			let out: Blob;
			if (fmt === 'png') {
				const { default: UPNG } = await import('upng-js');
				const rgba = ctx.getImageData(0, 0, w, h).data;
				out = new Blob([UPNG.encode([rgba.buffer as ArrayBuffer], w, h, colors)], {
					type: 'image/png'
				});
			} else {
				out = await canvasToBlob(canvas, MIME[fmt], quality / 100);
			}

			const ext = fmt === 'jpeg' ? 'jpg' : fmt;
			if (job.outUrl) URL.revokeObjectURL(job.outUrl);
			job.out = out;
			job.outUrl = URL.createObjectURL(out);
			job.outName = job.file.name.replace(/\.[^.]+$/, '') + `.min.${ext}`;
			job.width = w;
			job.height = h;
			job.status = 'done';
		} catch (e) {
			job.status = 'error';
			job.error = e instanceof Error ? e.message : String(e);
		}
	}

	// Proses berurutan dan beri jeda ke event loop supaya UI tetap responsif di antara file.
	async function processAll(list: Job[]) {
		for (const job of list) {
			await compress(job);
			await new Promise((r) => setTimeout(r, 0));
		}
	}

	function addFiles(files: FileList | File[]) {
		const added: Job[] = [];
		for (const file of files) {
			if (!file.type.startsWith('image/')) continue;
			added.push({ id: nextId++, file, srcUrl: URL.createObjectURL(file), status: 'pending' });
		}
		if (!added.length) return;
		jobs = [...jobs, ...added];
		// Ambil elemen dari `jobs` (proxy reaktif), bukan `added`, agar mutasi di compress() memicu render.
		processAll(jobs.slice(-added.length));
	}

	function recompressAll() {
		processAll(jobs);
	}

	function remove(job: Job) {
		URL.revokeObjectURL(job.srcUrl);
		if (job.outUrl) URL.revokeObjectURL(job.outUrl);
		jobs = jobs.filter((j) => j.id !== job.id);
	}

	function downloadAll() {
		for (const j of jobs) {
			if (!j.outUrl || !j.outName) continue;
			const a = document.createElement('a');
			a.href = j.outUrl;
			a.download = j.outName;
			a.click();
		}
	}

	function onDrop(e: DragEvent) {
		e.preventDefault();
		dragging = false;
		if (e.dataTransfer?.files.length) addFiles(e.dataTransfer.files);
	}

	function onPaste(e: ClipboardEvent) {
		const files = [...(e.clipboardData?.files ?? [])];
		if (files.length) addFiles(files);
	}

	onDestroy(() => {
		for (const j of jobs) {
			URL.revokeObjectURL(j.srcUrl);
			if (j.outUrl) URL.revokeObjectURL(j.outUrl);
		}
	});

	const totals = $derived.by(() => {
		const done = jobs.filter((j) => j.out);
		const before = done.reduce((s, j) => s + j.file.size, 0);
		const after = done.reduce((s, j) => s + (j.out?.size ?? 0), 0);
		return { count: done.length, before, after };
	});
</script>

<svelte:window onpaste={onPaste} />

<ToolHeader slug="image" />

<div class="space-y-4">
	<div class="flex flex-wrap items-end gap-4">
		<div class="grid gap-1.5">
			<Label for="img-format" class="text-xs">Format output</Label>
			<NativeSelect id="img-format" size="sm" bind:value={format}>
				<option value="same">Same as original</option>
				<option value="png">PNG (quantized)</option>
				<option value="jpeg">JPEG</option>
				<option value="webp">WebP</option>
			</NativeSelect>
		</div>
		{#if format !== 'jpeg' && format !== 'webp'}
			<div class="grid w-48 gap-1.5">
				<Label for="img-colors" class="text-xs"
					>PNG colors: {colors === 0 ? 'lossless' : colors}</Label
				>
				<NativeSelect id="img-colors" size="sm" class="w-full" bind:value={colors}>
					<option value={256}>256 (recommended)</option>
					<option value={128}>128</option>
					<option value={64}>64</option>
					<option value={32}>32</option>
					<option value={0}>Lossless (re-deflate only)</option>
				</NativeSelect>
			</div>
		{/if}
		{#if format !== 'png'}
			<div class="grid w-48 gap-1.5">
				<Label for="img-quality" class="text-xs">JPEG/WebP quality: {quality}</Label>
				<input
					id="img-quality"
					type="range"
					min="30"
					max="100"
					class="accent-primary h-8 w-full cursor-pointer"
					bind:value={quality}
				/>
			</div>
		{/if}
		<div class="grid w-36 gap-1.5">
			<Label for="img-width" class="text-xs">Max width (px)</Label>
			<Input
				id="img-width"
				class="h-8"
				type="number"
				min="1"
				placeholder="Original"
				bind:value={maxWidth}
			/>
		</div>
		<Button variant="outline" size="sm" onclick={recompressAll} disabled={!jobs.length}>
			<RefreshCw />Re-apply
		</Button>
	</div>

	<label
		class="flex min-h-36 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed p-6 text-center text-sm transition-colors {dragging
			? 'border-primary bg-primary/10'
			: 'hover:border-ring/50'}"
		ondragover={(e) => {
			e.preventDefault();
			dragging = true;
		}}
		ondragleave={() => (dragging = false)}
		ondrop={onDrop}
	>
		<ImageUp class="text-muted-foreground mb-1 size-6" aria-hidden="true" />
		<span>Drag images here, click to choose, or paste (Ctrl+V)</span>
		<span class="text-muted-foreground text-xs">
			Processed in the browser — images are not uploaded to the server.
		</span>
		<input
			type="file"
			accept="image/png,image/jpeg,image/webp"
			multiple
			class="sr-only"
			onchange={(e) => {
				const input = e.currentTarget;
				if (input.files) addFiles(input.files);
				input.value = '';
			}}
		/>
	</label>

	{#if totals.count}
		<div class="flex flex-wrap items-center justify-between gap-2 text-sm">
			<span>
				{totals.count} file · {fmtSize(totals.before)} → {fmtSize(totals.after)}
				<strong class={totals.after < totals.before ? 'text-success' : 'text-warning'}>
					({totals.before ? Math.round((1 - totals.after / totals.before) * 100) : 0}% saved)
				</strong>
			</span>
			<Button size="sm" onclick={downloadAll}><Download />Download all</Button>
		</div>
	{/if}

	<ul class="space-y-2" role="list">
		{#each jobs as job (job.id)}
			{@const saved = job.out ? 1 - job.out.size / job.file.size : 0}
			<li class="bg-card flex flex-wrap items-center gap-3 rounded-lg border p-2">
				<img
					src={job.outUrl ?? job.srcUrl}
					alt=""
					class="h-16 w-16 shrink-0 rounded-sm border bg-[repeating-conic-gradient(#333_0_25%,#222_0_50%)] bg-[length:12px_12px] object-contain"
				/>
				<div class="min-w-0 flex-1 text-sm">
					<div class="truncate font-medium" title={job.file.name}>{job.file.name}</div>
					<div class="text-muted-foreground text-xs">
						{fmtSize(job.file.size)}
						{#if job.status === 'done' && job.out}
							→ {fmtSize(job.out.size)}
							<span class={saved > 0 ? 'text-success' : 'text-warning'}>
								({saved > 0 ? '-' : '+'}{Math.abs(Math.round(saved * 100))}%)
							</span>
							· {job.width}×{job.height}
						{:else if job.status === 'working' || job.status === 'pending'}
							<Spinner class="inline-block size-3 align-middle" />
						{:else if job.status === 'error'}
							<span class="text-destructive">{job.error}</span>
						{/if}
					</div>
					{#if job.status === 'done' && saved <= 0}
						<div class="text-warning text-xs">Result is not smaller — keep the original file.</div>
					{/if}
				</div>
				<div class="flex gap-1">
					{#if job.outUrl}
						<Button
							variant="outline"
							size="sm"
							href={job.outUrl}
							download={job.outName}
							aria-label="Download {job.outName}"><Download />Download</Button
						>
					{/if}
					<Button
						variant="ghost"
						size="icon-sm"
						class="tap-target"
						onclick={() => remove(job)}
						aria-label="Remove {job.file.name}"><X /></Button
					>
				</div>
			</li>
		{/each}
	</ul>
</div>
