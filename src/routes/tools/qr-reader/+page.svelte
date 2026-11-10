<script lang="ts">
	import { onDestroy } from 'svelte';
	import ToolHeader from '$lib/components/tools/ToolHeader.svelte';
	import CopyButton from '$lib/components/CopyButton.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import Camera from '@lucide/svelte/icons/camera';
	import CameraOff from '@lucide/svelte/icons/camera-off';
	import ClipboardPaste from '@lucide/svelte/icons/clipboard-paste';
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import { errorMessage } from '$lib/tool-utils';

	type Decode = (
		data: Uint8ClampedArray,
		w: number,
		h: number,
		opts?: { inversionAttempts?: string }
	) => { data: string } | null;

	let result = $state<string | null>(null);
	let status = $state('');
	let previewUrl = $state<string | null>(null);
	let dragging = $state(false);
	let video = $state<HTMLVideoElement>();
	let stream = $state<MediaStream | null>(null);
	let raf = 0;
	let jsqr: Decode | null = null;

	async function decoder(): Promise<Decode> {
		jsqr ??= (await import('jsqr')).default as unknown as Decode;
		return jsqr;
	}

	// Gambar diperkecil ke maks 1600px supaya decoding cepat tanpa kehilangan modul QR.
	async function decodeImage(blob: Blob) {
		status = 'Decoding…';
		result = null;
		if (previewUrl) URL.revokeObjectURL(previewUrl);
		previewUrl = URL.createObjectURL(blob);
		try {
			const bmp = await createImageBitmap(blob);
			const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
			const w = Math.round(bmp.width * scale);
			const h = Math.round(bmp.height * scale);
			const canvas = new OffscreenCanvas(w, h);
			const ctx = canvas.getContext('2d')!;
			ctx.drawImage(bmp, 0, 0, w, h);
			const img = ctx.getImageData(0, 0, w, h);
			const hit = (await decoder())(img.data, w, h, { inversionAttempts: 'attemptBoth' });
			result = hit?.data ?? null;
			status = hit ? '' : 'No QR code found in this image.';
		} catch (e) {
			status = `Could not read image: ${errorMessage(e)}`;
		}
	}

	function onFile(e: Event) {
		const f = (e.currentTarget as HTMLInputElement).files?.[0];
		if (f) decodeImage(f);
	}

	async function paste() {
		try {
			const items = await navigator.clipboard.read();
			for (const it of items) {
				const type = it.types.find((t) => t.startsWith('image/'));
				if (type) return decodeImage(await it.getType(type));
			}
			status = 'Clipboard has no image.';
		} catch (e) {
			status = `Clipboard unavailable: ${errorMessage(e)}`;
		}
	}

	function onPaste(e: ClipboardEvent) {
		const f = [...(e.clipboardData?.files ?? [])].find((x) => x.type.startsWith('image/'));
		if (f) {
			e.preventDefault();
			decodeImage(f);
		}
	}

	async function startCamera() {
		try {
			stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
			status = 'Point the camera at a QR code…';
			result = null;
			await new Promise((r) => requestAnimationFrame(r));
			if (!video) return;
			video.srcObject = stream;
			await video.play();
			const decode = await decoder();
			const canvas = document.createElement('canvas');
			const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
			const tick = () => {
				if (!stream || !video) return;
				if (video.readyState >= 2) {
					canvas.width = video.videoWidth;
					canvas.height = video.videoHeight;
					ctx.drawImage(video, 0, 0);
					const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
					const hit = decode(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' });
					if (hit) {
						result = hit.data;
						status = '';
						stopCamera();
						return;
					}
				}
				raf = requestAnimationFrame(tick);
			};
			tick();
		} catch (e) {
			status = `Camera unavailable: ${errorMessage(e)}`;
			stopCamera();
		}
	}

	function stopCamera() {
		cancelAnimationFrame(raf);
		stream?.getTracks().forEach((t) => t.stop());
		stream = null;
	}

	onDestroy(() => {
		stopCamera();
		if (previewUrl) URL.revokeObjectURL(previewUrl);
	});

	const isUrl = $derived(!!result && /^https?:\/\/\S+$/i.test(result));
	const wifi = $derived.by(() => {
		if (!result?.startsWith('WIFI:')) return null;
		const get = (k: string) =>
			result!.match(new RegExp(`[:;]${k}:((?:\\\\.|[^;])*)`))?.[1]?.replace(/\\(.)/g, '$1') ?? '';
		return { ssid: get('S'), password: get('P'), type: get('T') || 'nopass' };
	});
</script>

<svelte:window onpaste={onPaste} />

<ToolHeader slug="qr-reader" />

<div class="grid gap-6 lg:grid-cols-2">
	<section class="space-y-3">
		<label
			class="bg-well hover:border-ring/50 flex min-h-48 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-4 text-center text-sm transition-colors {dragging
				? 'border-ring'
				: ''}"
			ondragover={(e) => {
				e.preventDefault();
				dragging = true;
			}}
			ondragleave={() => (dragging = false)}
			ondrop={(e) => {
				e.preventDefault();
				dragging = false;
				const f = e.dataTransfer?.files[0];
				if (f) decodeImage(f);
			}}
		>
			{#if previewUrl && !stream}
				<img src={previewUrl} alt="Uploaded" class="max-h-56 rounded" />
			{:else}
				<span>Drop an image, click to choose, or paste (Ctrl/⌘+V)</span>
			{/if}
			<Input type="file" accept="image/*" class="sr-only" onchange={onFile} />
		</label>
		<div class="flex flex-wrap gap-2">
			<Button variant="outline" size="sm" onclick={paste}><ClipboardPaste />Paste image</Button>
			{#if stream}
				<Button variant="outline" size="sm" onclick={stopCamera}><CameraOff />Stop camera</Button>
			{:else}
				<Button variant="outline" size="sm" onclick={startCamera}><Camera />Scan with camera</Button
				>
			{/if}
		</div>
		{#if stream}
			<!-- svelte-ignore a11y_media_has_caption -->
			<video bind:this={video} class="w-full rounded-lg border" playsinline muted></video>
		{/if}
	</section>

	<section class="space-y-3" aria-live="polite">
		<span class="label-mono">Decoded</span>
		{#if result !== null}
			<div class="bg-card space-y-2 rounded-lg border p-3">
				<pre class="font-mono text-sm break-all whitespace-pre-wrap">{result}</pre>
				<div class="flex flex-wrap gap-2">
					<CopyButton text={result} variant="outline" size="sm" />
					{#if isUrl}
						<Button
							variant="outline"
							size="sm"
							href={result}
							target="_blank"
							rel="noopener noreferrer"><ExternalLink />Open link</Button
						>
					{/if}
				</div>
			</div>
			{#if wifi}
				<dl class="bg-card grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 rounded-lg border p-3 text-xs">
					<dt class="label-mono">Wi-Fi SSID</dt>
					<dd class="font-mono">{wifi.ssid}</dd>
					<dt class="label-mono">Password</dt>
					<dd class="flex items-center gap-1 font-mono">
						{wifi.password || '—'}{#if wifi.password}<CopyButton text={wifi.password} />{/if}
					</dd>
					<dt class="label-mono">Security</dt>
					<dd class="font-mono">{wifi.type}</dd>
				</dl>
			{/if}
		{:else if status}
			<p class="text-muted-foreground text-sm">{status}</p>
		{:else}
			<p class="text-muted-foreground text-sm">—</p>
		{/if}
	</section>
</div>
