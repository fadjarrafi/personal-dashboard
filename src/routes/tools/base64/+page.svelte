<script lang="ts">
	import ToolHeader from '$lib/components/tools/ToolHeader.svelte';
	import Segmented from '$lib/components/tools/Segmented.svelte';
	import TextInput from '$lib/components/tools/TextInput.svelte';
	import Output from '$lib/components/tools/Output.svelte';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Checkbox } from '$lib/components/ui/checkbox/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import Download from '@lucide/svelte/icons/download';
	import {
		bytesToBase64,
		base64ToBytes,
		toBase64Url,
		fmtSize,
		downloadBlob,
		errorMessage
	} from '$lib/tool-utils';

	let mode = $state<'text' | 'file'>('text');
	let direction = $state<'encode' | 'decode'>('encode');
	let urlSafe = $state(false);
	let input = $state('');

	const text = $derived.by((): { value: string; error: string | null } => {
		if (!input) return { value: '', error: null };
		try {
			if (direction === 'encode') {
				const b64 = bytesToBase64(new TextEncoder().encode(input));
				return { value: urlSafe ? toBase64Url(b64) : b64, error: null };
			}
			const bytes = base64ToBytes(input.replace(/^data:[^,]*,/, ''));
			return { value: new TextDecoder('utf-8', { fatal: true }).decode(bytes), error: null };
		} catch (e) {
			return {
				value: '',
				error:
					direction === 'decode'
						? `Not valid Base64 or not UTF-8 text (${errorMessage(e)}). Use File mode for binary data.`
						: errorMessage(e)
			};
		}
	});

	// ── File mode ──
	let file = $state<File | null>(null);
	let fileB64 = $state('');
	let asDataUri = $state(true);
	let decodeInput = $state('');
	let decodeError = $state<string | null>(null);

	async function onFile(e: Event) {
		file = (e.currentTarget as HTMLInputElement).files?.[0] ?? null;
		fileB64 = file ? bytesToBase64(new Uint8Array(await file.arrayBuffer())) : '';
	}

	const fileOut = $derived(
		!file || !fileB64
			? ''
			: asDataUri
				? `data:${file.type || 'application/octet-stream'};base64,${fileB64}`
				: urlSafe
					? toBase64Url(fileB64)
					: fileB64
	);

	function downloadDecoded() {
		decodeError = null;
		try {
			const m = decodeInput.trim().match(/^data:([^;,]*)(?:;[^,]*)?,/);
			const mime = m?.[1] || 'application/octet-stream';
			const bytes = base64ToBytes(m ? decodeInput.trim().slice(m[0].length) : decodeInput);
			const ext = mime.split('/')[1]?.split('+')[0] ?? 'bin';
			downloadBlob(new Blob([bytes as Uint8Array<ArrayBuffer>], { type: mime }), `decoded.${ext}`);
		} catch (e) {
			decodeError = errorMessage(e);
		}
	}
</script>

<ToolHeader slug="base64" />

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
		{#if mode === 'text'}
			<Segmented
				bind:value={direction}
				options={[
					{ value: 'encode', label: 'Encode' },
					{ value: 'decode', label: 'Decode' }
				]}
				ariaLabel="Direction"
			/>
		{/if}
		<div class="flex items-center gap-2">
			<Checkbox id="b64-url" bind:checked={urlSafe} />
			<Label for="b64-url" class="text-xs font-normal">URL-safe (Base64URL)</Label>
		</div>
	</div>

	{#if mode === 'text'}
		<div class="grid gap-4 lg:grid-cols-2">
			<TextInput
				bind:value={input}
				label={direction === 'encode' ? 'Text' : 'Base64'}
				placeholder={direction === 'encode' ? 'Hello, world' : 'SGVsbG8sIHdvcmxk'}
			/>
			<Output
				value={text.value}
				error={text.error}
				label={direction === 'encode' ? 'Base64' : 'Text'}
			/>
		</div>
		<p class="text-muted-foreground text-xs">
			Decoding accepts standard and URL-safe alphabets, missing padding, and a data: URI prefix.
		</p>
	{:else}
		<div class="grid gap-6 lg:grid-cols-2">
			<section class="space-y-3">
				<span class="label-mono">File → Base64</span>
				<Input type="file" aria-label="File to encode" onchange={onFile} />
				{#if file}
					<p class="text-muted-foreground text-xs">
						{file.name} · {fmtSize(file.size)} → {fmtSize(fileOut.length)} encoded
					</p>
				{/if}
				<div class="flex items-center gap-2">
					<Checkbox id="b64-datauri" bind:checked={asDataUri} />
					<Label for="b64-datauri" class="text-xs font-normal">Output as data: URI</Label>
				</div>
				<Output
					value={fileOut.length > 200_000 ? fileOut.slice(0, 200_000) + '…' : fileOut}
					copy={fileOut}
				/>
				{#if fileOut.length > 200_000}
					<p class="text-muted-foreground text-xs">
						Preview truncated — Copy copies the full {fmtSize(fileOut.length)}.
					</p>
				{/if}
			</section>
			<section class="space-y-3">
				<TextInput
					bind:value={decodeInput}
					label="Base64 → File"
					placeholder="data:image/png;base64,iVBORw0… or raw Base64"
				/>
				<Button size="sm" onclick={downloadDecoded} disabled={!decodeInput.trim()}>
					<Download />Download file
				</Button>
				{#if decodeError}
					<p role="alert" class="text-destructive text-sm">{decodeError}</p>
				{/if}
			</section>
		</div>
	{/if}
</div>
