<script lang="ts">
	import CopyButton from '$lib/components/CopyButton.svelte';
	import ToolHeader from '$lib/components/tools/ToolHeader.svelte';

	let input = $state('');
	let indent = $state<'2' | '4' | 'tab'>('2');
	let sortKeys = $state(false);
	let output = $state('');
	let error = $state<string | null>(null);

	function sortDeep(v: unknown): unknown {
		if (Array.isArray(v)) return v.map(sortDeep);
		if (v && typeof v === 'object') {
			const obj = v as Record<string, unknown>;
			return Object.fromEntries(
				Object.keys(obj)
					.sort()
					.map((k) => [k, sortDeep(obj[k])])
			);
		}
		return v;
	}

	// Ubah "position N" dari pesan JSON.parse menjadi baris:kolom.
	function describeError(e: unknown): string {
		const msg = e instanceof Error ? e.message : String(e);
		const m = msg.match(/position (\d+)/);
		if (!m) return msg;
		const pos = Number(m[1]);
		const before = input.slice(0, pos);
		const line = before.split('\n').length;
		const col = pos - before.lastIndexOf('\n');
		return `${msg} (line ${line}, column ${col})`;
	}

	function run(mode: 'format' | 'minify') {
		error = null;
		if (!input.trim()) {
			output = '';
			return;
		}
		try {
			let value = JSON.parse(input);
			if (sortKeys) value = sortDeep(value);
			const space = mode === 'minify' ? undefined : indent === 'tab' ? '\t' : Number(indent);
			output = JSON.stringify(value, null, space);
		} catch (e) {
			output = '';
			error = describeError(e);
		}
	}
</script>

<ToolHeader slug="json" />

<div class="grid gap-4 lg:grid-cols-2">
	<section class="space-y-2">
		<div class="flex items-center justify-between">
			<span class="label-mono">Input</span>
			<button type="button" class="btn btn-ghost btn-xs rounded-none" onclick={() => (input = '')}>
				Clear
			</button>
		</div>
		<textarea
			class="textarea textarea-bordered h-80 w-full font-mono text-xs"
			bind:value={input}
			spellcheck="false"
			placeholder={'{"hello": "world"}'}
			aria-label="JSON input"
		></textarea>
		<div class="flex flex-wrap items-center gap-2">
			<button type="button" class="btn-brutal btn-sm" onclick={() => run('format')}>Format</button>
			<button type="button" class="btn-brutal-ghost btn-sm" onclick={() => run('minify')}>
				Minify
			</button>
			<select class="select select-bordered select-sm" bind:value={indent} aria-label="Indentation">
				<option value="2">2 spaces</option>
				<option value="4">4 spaces</option>
				<option value="tab">Tab</option>
			</select>
			<label class="label cursor-pointer gap-2">
				<input type="checkbox" class="checkbox checkbox-sm" bind:checked={sortKeys} />
				<span class="label-text text-xs">Sort keys</span>
			</label>
		</div>
	</section>

	<section class="space-y-2">
		<div class="flex items-center justify-between">
			<span class="label-mono">Output</span>
			<CopyButton text={output} />
		</div>
		{#if error}
			<div role="alert" class="alert alert-error rounded-none text-sm">{error}</div>
		{:else}
			<pre
				class="h-80 overflow-auto border border-base-300 bg-black p-3 font-mono text-xs">{output ||
					'—'}</pre>
			{#if output}<p class="text-xs opacity-60">JSON valid · {output.length} characters</p>{/if}
		{/if}
	</section>
</div>
