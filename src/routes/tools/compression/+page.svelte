<script lang="ts">
	import ToolHeader from '$lib/components/tools/ToolHeader.svelte';
	import Segmented from '$lib/components/tools/Segmented.svelte';
	import TextInput from '$lib/components/tools/TextInput.svelte';
	import Output from '$lib/components/tools/Output.svelte';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { NativeSelect } from '$lib/components/ui/native-select/index.js';
	import Download from '@lucide/svelte/icons/download';
	import {
		bytesToBase64,
		base64ToBytes,
		fmtSize,
		downloadBlob,
		errorMessage
	} from '$lib/tool-utils';

	type Algo = 'gzip' | 'deflate' | 'deflate-raw';

	let algo = $state<Algo>('gzip');
	let mode = $state<'text' | 'file'>('text');
	let direction = $state<'compress' | 'decompress'>('compress');
	let input = $state('');
	let output = $state('');
	let error = $state<string | null>(null);
	let stats = $state('');

	async function pipe(
		bytes: Uint8Array,
		stream: CompressionStream | DecompressionStream
	): Promise<Uint8Array> {
		const res = new Response(
			new Blob([bytes as Uint8Array<ArrayBuffer>]).stream().pipeThrough(stream)
		);
		return new Uint8Array(await res.arrayBuffer());
	}

	// Teks: compress → Base64, decompress ← Base64. Dijalankan ulang setiap input/opsi berubah.
	$effect(() => {
		if (mode !== 'text') return;
		const src = input;
		const a = algo;
		const dir = direction;
		let cancelled = false;
		(async () => {
			if (!src) {
				output = '';
				error = null;
				stats = '';
				return;
			}
			try {
				if (dir === 'compress') {
					const raw = new TextEncoder().encode(src);
					const out = await pipe(raw, new CompressionStream(a));
					if (cancelled) return;
					output = bytesToBase64(out);
					stats = `${fmtSize(raw.length)} → ${fmtSize(out.length)} (${((out.length / raw.length) * 100).toFixed(1)}%) · Base64 ${fmtSize(output.length)}`;
				} else {
					const out = await pipe(base64ToBytes(src), new DecompressionStream(a));
					if (cancelled) return;
					output = new TextDecoder().decode(out);
					stats = `${fmtSize(out.length)} decompressed`;
				}
				error = null;
			} catch (e) {
				if (cancelled) return;
				output = '';
				stats = '';
				error = `${errorMessage(e)} — check the algorithm and that the input is Base64 of ${a} data.`;
			}
		})();
		return () => {
			cancelled = true;
		};
	});

	let file = $state<File | null>(null);
	let busy = $state(false);

	async function runFile() {
		if (!file) return;
		busy = true;
		error = null;
		try {
			const bytes = new Uint8Array(await file.arrayBuffer());
			const ext = algo === 'gzip' ? '.gz' : '.zz';
			if (direction === 'compress') {
				const out = await pipe(bytes, new CompressionStream(algo));
				stats = `${fmtSize(bytes.length)} → ${fmtSize(out.length)} (${((out.length / bytes.length) * 100).toFixed(1)}%)`;
				downloadBlob(new Blob([out as Uint8Array<ArrayBuffer>]), file.name + ext);
			} else {
				const out = await pipe(bytes, new DecompressionStream(algo));
				stats = `${fmtSize(bytes.length)} → ${fmtSize(out.length)}`;
				downloadBlob(
					new Blob([out as Uint8Array<ArrayBuffer>]),
					file.name.replace(/\.(gz|zz|z|deflate)$/i, '') || 'decompressed'
				);
			}
		} catch (e) {
			error = errorMessage(e);
		} finally {
			busy = false;
		}
	}
</script>

<ToolHeader slug="compression" />

<div class="space-y-3">
	<div class="flex flex-wrap items-center gap-3">
		<Segmented
			bind:value={mode}
			options={[
				{ value: 'text', label: 'Text' },
				{ value: 'file', label: 'File' }
			]}
			ariaLabel="Source"
		/>
		<Segmented
			bind:value={direction}
			options={[
				{ value: 'compress', label: 'Compress' },
				{ value: 'decompress', label: 'Decompress' }
			]}
			ariaLabel="Direction"
		/>
		<NativeSelect size="sm" bind:value={algo} aria-label="Algorithm">
			<option value="gzip">gzip</option>
			<option value="deflate">deflate (zlib)</option>
			<option value="deflate-raw">deflate-raw</option>
		</NativeSelect>
	</div>

	{#if mode === 'text'}
		<div class="grid gap-4 lg:grid-cols-2">
			<TextInput
				bind:value={input}
				label={direction === 'compress' ? 'Text' : 'Base64 (compressed)'}
			/>
			<Output
				value={output}
				{error}
				label={direction === 'compress' ? 'Base64 (compressed)' : 'Text'}
			/>
		</div>
	{:else}
		<div class="flex max-w-md flex-col gap-3">
			<Input
				type="file"
				aria-label="File"
				onchange={(e) => (file = e.currentTarget.files?.[0] ?? null)}
			/>
			<Button size="sm" class="self-start" onclick={runFile} disabled={!file || busy}>
				<Download />{direction === 'compress' ? 'Compress & download' : 'Decompress & download'}
			</Button>
			{#if error}<p role="alert" class="text-destructive text-sm">{error}</p>{/if}
		</div>
	{/if}
	{#if stats}<p class="text-muted-foreground text-xs">{stats}</p>{/if}
</div>
