<script lang="ts">
	import CopyButton from '$lib/components/CopyButton.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { NativeSelect } from '$lib/components/ui/native-select/index.js';
	import { Checkbox } from '$lib/components/ui/checkbox/index.js';
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
			<Button variant="ghost" size="xs" onclick={() => (input = '')}>Clear</Button>
		</div>
		<Textarea
			class="bg-well h-80 font-mono text-xs"
			bind:value={input}
			spellcheck="false"
			placeholder={'{"hello": "world"}'}
			aria-label="JSON input"
		/>
		<div class="flex flex-wrap items-center gap-2">
			<Button size="sm" onclick={() => run('format')}>Format</Button>
			<Button variant="outline" size="sm" onclick={() => run('minify')}>Minify</Button>
			<NativeSelect size="sm" bind:value={indent} aria-label="Indentation">
				<option value="2">2 spaces</option>
				<option value="4">4 spaces</option>
				<option value="tab">Tab</option>
			</NativeSelect>
			<div class="flex items-center gap-2">
				<Checkbox id="json-sort" bind:checked={sortKeys} />
				<Label for="json-sort" class="text-xs font-normal">Sort keys</Label>
			</div>
		</div>
	</section>

	<section class="space-y-2">
		<div class="flex items-center justify-between">
			<span class="label-mono">Output</span>
			<CopyButton text={output} />
		</div>
		{#if error}
			<p role="alert" class="border-destructive/40 text-destructive rounded-md border p-3 text-sm">
				{error}
			</p>
		{:else}
			<pre class="bg-well h-80 overflow-auto rounded-md border p-3 font-mono text-xs">{output ||
					'—'}</pre>
			{#if output}
				<p class="text-muted-foreground text-xs">JSON valid · {output.length} characters</p>
			{/if}
		{/if}
	</section>
</div>
