<script lang="ts">
	import CopyButton from '$lib/components/CopyButton.svelte';
	import ToolHeader from '$lib/components/tools/ToolHeader.svelte';

	const ALGOS = ['MD5', 'SHA-1', 'SHA-256', 'SHA-384', 'SHA-512'] as const;
	type Algo = (typeof ALGOS)[number];

	// Baca file per-chunk supaya MD5 file besar tidak perlu satu ArrayBuffer raksasa sekaligus
	// untuk spark-md5; SHA via WebCrypto tetap butuh buffer utuh.
	const CHUNK = 4 * 1024 * 1024;

	let mode = $state<'text' | 'file'>('text');
	let text = $state('');
	let file = $state<File | null>(null);
	let encoding = $state<'hex' | 'base64'>('hex');
	let compare = $state('');
	let busy = $state(false);
	let progress = $state(0);
	let digests = $state<Partial<Record<Algo, Uint8Array>>>({});

	function toHex(b: Uint8Array) {
		return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
	}
	function toBase64(b: Uint8Array) {
		let s = '';
		for (const x of b) s += String.fromCharCode(x);
		return btoa(s);
	}
	function hexToBytes(h: string) {
		return Uint8Array.from(h.match(/../g) ?? [], (x) => parseInt(x, 16));
	}

	async function md5Of(source: Uint8Array | File): Promise<Uint8Array> {
		const { default: SparkMD5 } = await import('spark-md5');
		const spark = new SparkMD5.ArrayBuffer();
		if (source instanceof Uint8Array) {
			spark.append(source.buffer.slice(source.byteOffset, source.byteOffset + source.byteLength) as ArrayBuffer);
		} else {
			for (let off = 0; off < source.size; off += CHUNK) {
				spark.append(await source.slice(off, off + CHUNK).arrayBuffer());
				progress = Math.min(1, (off + CHUNK) / source.size);
			}
		}
		return hexToBytes(spark.end());
	}

	async function compute() {
		const source = mode === 'text' ? new TextEncoder().encode(text) : file;
		if (!source) {
			digests = {};
			return;
		}
		busy = true;
		progress = 0;
		try {
			const md5 = await md5Of(source);
			const buf = source instanceof Uint8Array ? source : new Uint8Array(await source.arrayBuffer());
			const next: Partial<Record<Algo, Uint8Array>> = { MD5: md5 };
			for (const algo of ALGOS.slice(1)) {
				next[algo] = new Uint8Array(await crypto.subtle.digest(algo, buf as Uint8Array<ArrayBuffer>));
			}
			digests = next;
		} finally {
			busy = false;
		}
	}

	// Teks dihitung ulang otomatis (debounce); file dihitung saat dipilih.
	$effect(() => {
		if (mode !== 'text') return;
		void text;
		const t = setTimeout(compute, 150);
		return () => clearTimeout(t);
	});

	function onFile(e: Event) {
		file = (e.currentTarget as HTMLInputElement).files?.[0] ?? null;
		compute();
	}

	function fmt(b: Uint8Array | undefined) {
		if (!b) return '';
		return encoding === 'hex' ? toHex(b) : toBase64(b);
	}

	const normalizedCompare = $derived(compare.trim().toLowerCase());
	function matches(b: Uint8Array | undefined) {
		if (!b || !normalizedCompare) return false;
		return normalizedCompare === toHex(b) || compare.trim() === toBase64(b);
	}

	function fmtSize(n: number) {
		if (n < 1024) return `${n} B`;
		if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`;
		return `${(n / 1024 ** 2).toFixed(1)} MB`;
	}
</script>

<ToolHeader slug="hash" />

<div class="space-y-4">
	<div class="flex flex-wrap items-center gap-3">
		<div class="join" role="group" aria-label="Source">
			<button
				type="button"
				class="btn join-item btn-sm rounded-none {mode === 'text' ? 'btn-active' : ''}"
				aria-pressed={mode === 'text'}
				onclick={() => (mode = 'text')}>Text</button
			>
			<button
				type="button"
				class="btn join-item btn-sm rounded-none {mode === 'file' ? 'btn-active' : ''}"
				aria-pressed={mode === 'file'}
				onclick={() => {
					mode = 'file';
					digests = {};
					if (file) compute();
				}}>File</button
			>
		</div>
		<select class="select select-bordered select-sm" bind:value={encoding} aria-label="Format output">
			<option value="hex">Hex</option>
			<option value="base64">Base64</option>
		</select>
	</div>

	{#if mode === 'text'}
		<textarea
			class="textarea textarea-bordered h-32 w-full font-mono text-xs"
			bind:value={text}
			spellcheck="false"
			placeholder="Text to hash (UTF-8)"
			aria-label="Text"
		></textarea>
	{:else}
		<div class="space-y-1">
			<input type="file" class="file-input file-input-bordered w-full max-w-md" onchange={onFile} />
			{#if file}
				<p class="text-xs opacity-60">{file.name} · {fmtSize(file.size)}</p>
			{/if}
			{#if busy}
				<progress class="progress w-full max-w-md" value={progress} max="1"></progress>
			{/if}
		</div>
	{/if}

	<dl class="divide-y divide-base-300 border border-base-300">
		{#each ALGOS as algo}
			{@const value = fmt(digests[algo])}
			<div
				class="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 {matches(digests[algo])
					? 'bg-success/15'
					: ''}"
			>
				<dt class="label-mono w-16 shrink-0">{algo}</dt>
				<dd class="flex min-w-0 flex-1 items-center gap-1">
					<code class="min-w-0 flex-1 break-all font-mono text-xs">{value || '—'}</code>
					{#if matches(digests[algo])}<span class="badge badge-success rounded-none">match</span>{/if}
					<CopyButton text={value} />
				</dd>
			</div>
		{/each}
	</dl>

	<label class="form-control w-full">
		<div class="label py-1"><span class="label-mono">Compare with hash</span></div>
		<input
			class="input input-bordered w-full font-mono text-sm"
			bind:value={compare}
			spellcheck="false"
			placeholder="Paste a checksum to verify"
		/>
	</label>
	{#if normalizedCompare && Object.keys(digests).length}
		{@const hit = ALGOS.find((a) => matches(digests[a]))}
		<p class="text-sm {hit ? 'text-success' : 'text-error'}">
			{hit ? `✓ Matches ${hit}` : '✕ Does not match any algorithm'}
		</p>
	{/if}
</div>
