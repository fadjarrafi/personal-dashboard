<script lang="ts">
	import ToolHeader from '$lib/components/tools/ToolHeader.svelte';
	import TextInput from '$lib/components/tools/TextInput.svelte';
	import Output from '$lib/components/tools/Output.svelte';
	import { NativeSelect } from '$lib/components/ui/native-select/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Checkbox } from '$lib/components/ui/checkbox/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Spinner } from '$lib/components/ui/spinner/index.js';
	import { errorMessage } from '$lib/tool-utils';

	// parser Prettier → plugin yang dibutuhkan (di-load lazy dari prettier/plugins/*).
	const LANGS = {
		babel: { label: 'JavaScript', plugins: ['babel', 'estree'] },
		'babel-ts': { label: 'TypeScript', plugins: ['babel', 'estree'] },
		json: { label: 'JSON', plugins: ['babel', 'estree'] },
		css: { label: 'CSS', plugins: ['postcss'] },
		scss: { label: 'SCSS', plugins: ['postcss'] },
		less: { label: 'Less', plugins: ['postcss'] },
		html: { label: 'HTML', plugins: ['html', 'babel', 'postcss', 'estree'] },
		vue: { label: 'Vue', plugins: ['html', 'babel', 'postcss', 'estree'] },
		markdown: { label: 'Markdown', plugins: ['markdown'] },
		yaml: { label: 'YAML', plugins: ['yaml'] },
		graphql: { label: 'GraphQL', plugins: ['graphql'] }
	} as const;
	type Parser = keyof typeof LANGS;

	const PLUGIN_LOADERS: Record<string, () => Promise<unknown>> = {
		babel: () => import('prettier/plugins/babel'),
		estree: () => import('prettier/plugins/estree'),
		postcss: () => import('prettier/plugins/postcss'),
		html: () => import('prettier/plugins/html'),
		markdown: () => import('prettier/plugins/markdown'),
		yaml: () => import('prettier/plugins/yaml'),
		graphql: () => import('prettier/plugins/graphql')
	};

	let parser = $state<Parser>('babel');
	let input = $state(
		"const greet=(name)=>{return `Hello, ${name}`}\nfunction add(a,b){return a+b}\nconsole.log(greet('world'),add(1,2))"
	);
	let printWidth = $state(80);
	let tabWidth = $state<2 | 4>(2);
	let useTabs = $state(false);
	let semi = $state(true);
	let singleQuote = $state(true);
	let output = $state('');
	let error = $state<string | null>(null);
	let busy = $state(false);

	async function format() {
		busy = true;
		error = null;
		try {
			const [{ format }, ...plugins] = await Promise.all([
				import('prettier/standalone'),
				...LANGS[parser].plugins.map((p) => PLUGIN_LOADERS[p]())
			]);
			output = await format(input, {
				parser,
				plugins: plugins as never[],
				printWidth,
				tabWidth,
				useTabs,
				semi,
				singleQuote
			});
		} catch (e) {
			output = '';
			error = errorMessage(e);
		} finally {
			busy = false;
		}
	}
</script>

<ToolHeader slug="formatter" />

<div class="space-y-3">
	<div class="flex flex-wrap items-center gap-3">
		<NativeSelect size="sm" bind:value={parser} aria-label="Language">
			{#each Object.entries(LANGS) as [k, v] (k)}<option value={k}>{v.label}</option>{/each}
		</NativeSelect>
		<NativeSelect size="sm" bind:value={printWidth} aria-label="Print width">
			{#each [60, 80, 100, 120] as w (w)}<option value={w}>width {w}</option>{/each}
		</NativeSelect>
		<NativeSelect size="sm" bind:value={tabWidth} aria-label="Indent size">
			<option value={2}>2 spaces</option>
			<option value={4}>4 spaces</option>
		</NativeSelect>
		{#each [['fmt-tabs', 'Tabs', 'useTabs'], ['fmt-semi', 'Semicolons', 'semi'], ['fmt-sq', 'Single quotes', 'singleQuote']] as const as [id, label, key] (id)}
			<div class="flex items-center gap-2">
				{#if key === 'useTabs'}<Checkbox {id} bind:checked={useTabs} />
				{:else if key === 'semi'}<Checkbox {id} bind:checked={semi} />
				{:else}<Checkbox {id} bind:checked={singleQuote} />{/if}
				<Label for={id} class="text-xs font-normal">{label}</Label>
			</div>
		{/each}
		<Button size="sm" onclick={format} disabled={busy || !input.trim()}>
			{#if busy}<Spinner />{/if}Format
		</Button>
	</div>
	<div class="grid gap-4 lg:grid-cols-2">
		<TextInput bind:value={input} label="Source" height="h-[28rem]" />
		<Output value={output} {error} label="Formatted" height="h-[28rem]" wrap={false} />
	</div>
	<p class="text-muted-foreground text-xs">
		Powered by Prettier standalone — parsers load on first use.
	</p>
</div>
