<script lang="ts">
	import ToolHeader from '$lib/components/tools/ToolHeader.svelte';
	import TextInput from '$lib/components/tools/TextInput.svelte';
	import { NativeSelect } from '$lib/components/ui/native-select/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { errorMessage } from '$lib/tool-utils';

	type Draft = '07' | '2019' | '2020';

	let draft = $state<Draft>('2020');
	let schema = $state(`{
  "type": "object",
  "required": ["id", "email"],
  "properties": {
    "id": { "type": "integer", "minimum": 1 },
    "email": { "type": "string", "format": "email" },
    "tags": { "type": "array", "items": { "type": "string" }, "uniqueItems": true },
    "role": { "enum": ["admin", "user"] }
  },
  "additionalProperties": false
}`);
	let data = $state(`{
  "id": 0,
  "email": "not-an-email",
  "tags": ["a", "a"],
  "role": "guest",
  "extra": true
}`);

	type Issue = { path: string; message: string; keyword: string };
	let result = $state<{ valid: boolean; issues: Issue[] } | { error: string } | null>(null);

	// Ajv + ajv-formats tidak dipakai; format dasar diaktifkan manual supaya bundle tetap kecil.
	const FORMATS: Record<string, RegExp> = {
		email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
		uri: /^[a-z][a-z\d+.-]*:[^\s]*$/i,
		'date-time': /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:?\d{2})?$/i,
		date: /^\d{4}-\d{2}-\d{2}$/,
		time: /^\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:?\d{2})?$/i,
		uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
		ipv4: /^((25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(25[0-5]|2[0-4]\d|1?\d?\d)$/,
		hostname: /^(?=.{1,253}$)([a-z\d]([a-z\d-]{0,61}[a-z\d])?\.)*[a-z\d]([a-z\d-]{0,61}[a-z\d])?$/i
	};

	async function validate() {
		let s: unknown, d: unknown;
		try {
			s = JSON.parse(schema);
		} catch (e) {
			result = { error: `Schema is not valid JSON: ${errorMessage(e)}` };
			return;
		}
		try {
			d = JSON.parse(data);
		} catch (e) {
			result = { error: `Data is not valid JSON: ${errorMessage(e)}` };
			return;
		}
		try {
			const mod =
				draft === '07'
					? await import('ajv')
					: draft === '2019'
						? await import('ajv/dist/2019')
						: await import('ajv/dist/2020');
			const Ajv = mod.default;
			const ajv = new Ajv({ allErrors: true, strict: false, formats: FORMATS });
			const check = ajv.compile(s as object);
			const valid = check(d) as boolean;
			result = {
				valid,
				issues: (check.errors ?? []).map((e) => ({
					path: e.instancePath || '/',
					keyword: e.keyword,
					message:
						(e.message ?? '') +
						(e.keyword === 'additionalProperties'
							? `: “${(e.params as { additionalProperty: string }).additionalProperty}”`
							: e.keyword === 'enum'
								? `: ${JSON.stringify((e.params as { allowedValues: unknown[] }).allowedValues)}`
								: '')
				}))
			};
		} catch (e) {
			result = { error: `Invalid schema: ${errorMessage(e)}` };
		}
	}

	$effect(() => {
		void schema;
		void data;
		void draft;
		const t = setTimeout(validate, 300);
		return () => clearTimeout(t);
	});
</script>

<ToolHeader slug="json-schema" />

<div class="space-y-4">
	<div class="flex flex-wrap items-center gap-3">
		<NativeSelect size="sm" bind:value={draft} aria-label="Schema draft">
			<option value="2020">Draft 2020-12</option>
			<option value="2019">Draft 2019-09</option>
			<option value="07">Draft-07</option>
		</NativeSelect>
		<Button size="sm" variant="outline" onclick={validate}>Validate</Button>
	</div>
	<div class="grid gap-4 lg:grid-cols-2">
		<TextInput bind:value={schema} label="JSON Schema" height="h-80" />
		<TextInput bind:value={data} label="JSON data" height="h-80" />
	</div>

	{#if result}
		{#if 'error' in result}
			<p role="alert" class="border-destructive/40 text-destructive rounded-md border p-3 text-sm">
				{result.error}
			</p>
		{:else if result.valid}
			<p class="text-success text-sm">✓ Data is valid against the schema.</p>
		{:else}
			<div class="space-y-2" role="alert">
				<p class="text-destructive text-sm">
					✕ {result.issues.length} validation error{result.issues.length === 1 ? '' : 's'}
				</p>
				<ul class="bg-card divide-y rounded-lg border text-xs" role="list">
					{#each result.issues as issue, i (i)}
						<li class="flex flex-wrap gap-x-3 px-3 py-1.5">
							<code class="text-ink-2 font-mono">{issue.path}</code>
							<span class="min-w-0 flex-1">{issue.message}</span>
							<span class="label-mono">{issue.keyword}</span>
						</li>
					{/each}
				</ul>
			</div>
		{/if}
	{/if}
</div>
