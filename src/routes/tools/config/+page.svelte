<script lang="ts">
	import yaml from 'js-yaml';
	import * as TOML from 'smol-toml';
	import ToolHeader from '$lib/components/tools/ToolHeader.svelte';
	import TextInput from '$lib/components/tools/TextInput.svelte';
	import Output from '$lib/components/tools/Output.svelte';
	import { NativeSelect } from '$lib/components/ui/native-select/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import ArrowLeftRight from '@lucide/svelte/icons/arrow-left-right';
	import { errorMessage } from '$lib/tool-utils';

	type Fmt = 'json' | 'yaml' | 'toml' | 'env';
	const LABEL: Record<Fmt, string> = { json: 'JSON', yaml: 'YAML', toml: 'TOML', env: '.env' };

	let from = $state<Fmt>('yaml');
	let to = $state<Fmt>('json');
	let input = $state(`app:
  name: personal-dashboard
  port: 3000
  debug: false
database:
  url: file:./data/app.db
  pool: [1, 5]
`);

	// .env → objek datar; key A__B → { A: { B } } tidak diterapkan supaya tetap reversibel.
	function parseEnv(s: string): Record<string, string> {
		const out: Record<string, string> = {};
		for (const line of s.split(/\r?\n/)) {
			const m = line.match(/^\s*(?:export\s+)?([A-Za-z_][\w.-]*)\s*=\s*(.*)?\s*$/);
			if (!m) continue;
			let v = (m[2] ?? '').trim();
			if (/^".*"$/s.test(v)) v = v.slice(1, -1).replace(/\\n/g, '\n').replace(/\\"/g, '"');
			else if (/^'.*'$/s.test(v)) v = v.slice(1, -1);
			else v = v.replace(/\s+#.*$/, '');
			out[m[1]] = v;
		}
		return out;
	}

	// Objek bersarang → KEY_SUB=value (flatten dengan underscore, uppercase).
	function toEnv(data: unknown): string {
		const lines: string[] = [];
		const walk = (v: unknown, prefix: string) => {
			if (v && typeof v === 'object' && !Array.isArray(v)) {
				for (const [k, child] of Object.entries(v)) walk(child, prefix ? `${prefix}_${k}` : k);
				return;
			}
			const key = prefix.replace(/[^\w]/g, '_').toUpperCase();
			const s = Array.isArray(v) ? v.join(',') : v === null || v === undefined ? '' : String(v);
			lines.push(`${key}=${/[\s#"'$]/.test(s) || s === '' ? JSON.stringify(s) : s}`);
		};
		walk(data, '');
		return lines.join('\n');
	}

	function parse(s: string, f: Fmt): unknown {
		switch (f) {
			case 'json':
				return JSON.parse(s);
			case 'yaml':
				return yaml.load(s);
			case 'toml':
				return TOML.parse(s);
			case 'env':
				return parseEnv(s);
		}
	}

	function serialize(v: unknown, f: Fmt): string {
		switch (f) {
			case 'json':
				return JSON.stringify(v, null, 2);
			case 'yaml':
				return yaml.dump(v, { lineWidth: -1, noRefs: true });
			case 'toml':
				if (!v || typeof v !== 'object' || Array.isArray(v))
					throw new Error('TOML needs a table (object) at the top level');
				return TOML.stringify(v as Record<string, unknown>);
			case 'env':
				return toEnv(v);
		}
	}

	const out = $derived.by(() => {
		if (!input.trim()) return { value: '', error: null };
		try {
			return { value: serialize(parse(input, from), to), error: null };
		} catch (e) {
			return { value: '', error: errorMessage(e) };
		}
	});

	function swap() {
		if (out.value) input = out.value;
		[from, to] = [to, from];
	}
</script>

<ToolHeader slug="config" />

<div class="space-y-3">
	<div class="flex flex-wrap items-center gap-2">
		<NativeSelect size="sm" bind:value={from} aria-label="Input format">
			{#each Object.entries(LABEL) as [k, l] (k)}<option value={k}>{l}</option>{/each}
		</NativeSelect>
		<Button variant="ghost" size="sm" onclick={swap} aria-label="Swap formats"
			><ArrowLeftRight /></Button
		>
		<NativeSelect size="sm" bind:value={to} aria-label="Output format">
			{#each Object.entries(LABEL) as [k, l] (k)}<option value={k}>{l}</option>{/each}
		</NativeSelect>
	</div>
	<div class="grid gap-4 lg:grid-cols-2">
		<TextInput bind:value={input} label={LABEL[from]} height="h-96" />
		<Output value={out.value} error={out.error} label={LABEL[to]} height="h-96" wrap={false} />
	</div>
	{#if to === 'env'}
		<p class="text-muted-foreground text-xs">
			Nested keys are flattened with “_” and uppercased; arrays are comma-joined.
		</p>
	{/if}
</div>
