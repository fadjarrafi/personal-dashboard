<script lang="ts">
	import ToolHeader from '$lib/components/tools/ToolHeader.svelte';
	import Segmented from '$lib/components/tools/Segmented.svelte';
	import TextInput from '$lib/components/tools/TextInput.svelte';
	import Output from '$lib/components/tools/Output.svelte';
	import CopyButton from '$lib/components/CopyButton.svelte';
	import { Input } from '$lib/components/ui/input/index.js';
	import { errorMessage } from '$lib/tool-utils';

	let direction = $state<'encode' | 'decode'>('encode');
	let scope = $state<'component' | 'uri' | 'form'>('component');
	let input = $state('');

	const out = $derived.by((): { value: string; error: string | null } => {
		try {
			if (direction === 'encode') {
				if (scope === 'uri') return { value: encodeURI(input), error: null };
				const enc = encodeURIComponent(input);
				return { value: scope === 'form' ? enc.replace(/%20/g, '+') : enc, error: null };
			}
			const s = scope === 'form' ? input.replace(/\+/g, ' ') : input;
			return { value: scope === 'uri' ? decodeURI(s) : decodeURIComponent(s), error: null };
		} catch (e) {
			return { value: '', error: errorMessage(e) };
		}
	});

	// ── URL parser ──
	let raw = $state(
		'https://user:pass@example.com:8080/path/to/page?q=hello%20world&tag=a&tag=b#section'
	);
	const parsed = $derived.by(() => {
		try {
			return { url: new URL(raw.trim()), error: null };
		} catch {
			return { url: null, error: 'Not an absolute URL (include the scheme, e.g. https://).' };
		}
	});
	const parts = $derived(
		parsed.url
			? (
					[
						['protocol', parsed.url.protocol],
						['username', parsed.url.username],
						['password', parsed.url.password],
						['hostname', parsed.url.hostname],
						['port', parsed.url.port],
						['origin', parsed.url.origin],
						['pathname', decodeURIComponent(parsed.url.pathname)],
						['search', parsed.url.search],
						['hash', parsed.url.hash]
					] as const
				).filter(([, v]) => v)
			: []
	);
	const params = $derived(parsed.url ? [...parsed.url.searchParams.entries()] : []);
</script>

<ToolHeader slug="url" />

<div class="space-y-8">
	<div class="space-y-3">
		<div class="flex flex-wrap items-center gap-3">
			<Segmented
				bind:value={direction}
				options={[
					{ value: 'encode', label: 'Encode' },
					{ value: 'decode', label: 'Decode' }
				]}
				ariaLabel="Direction"
			/>
			<Segmented
				bind:value={scope}
				options={[
					{ value: 'component', label: 'Component' },
					{ value: 'uri', label: 'Full URI' },
					{ value: 'form', label: 'Form (+)' }
				]}
				ariaLabel="Scope"
			/>
		</div>
		<div class="grid gap-4 lg:grid-cols-2">
			<TextInput bind:value={input} height="h-40" />
			<Output value={out.value} error={out.error} height="h-40" />
		</div>
		<p class="text-muted-foreground text-xs">
			Component = encodeURIComponent (escapes / ? & =). Full URI = encodeURI (keeps URL structure).
			Form = application/x-www-form-urlencoded (space → +).
		</p>
	</div>

	<section class="space-y-3">
		<h2 class="label-mono">URL parser</h2>
		<Input
			class="font-mono text-sm"
			bind:value={raw}
			spellcheck="false"
			aria-label="URL to parse"
		/>
		{#if parsed.error && raw.trim()}
			<p role="alert" class="text-destructive text-sm">{parsed.error}</p>
		{/if}
		{#if parts.length}
			<dl class="bg-card divide-y rounded-lg border">
				{#each parts as [k, v] (k)}
					<div class="flex items-center gap-3 px-3 py-1.5">
						<dt class="label-mono w-24 shrink-0">{k}</dt>
						<dd class="flex min-w-0 flex-1 items-center gap-1">
							<code class="min-w-0 flex-1 font-mono text-xs break-all">{v}</code>
							<CopyButton text={v} />
						</dd>
					</div>
				{/each}
			</dl>
		{/if}
		{#if params.length}
			<h3 class="label-mono pt-2">Query parameters ({params.length})</h3>
			<div class="bg-card overflow-x-auto rounded-lg border">
				<table class="w-full text-left text-xs">
					<thead class="border-b">
						<tr
							><th class="label-mono px-3 py-1.5">Key</th><th class="label-mono px-3 py-1.5"
								>Value (decoded)</th
							></tr
						>
					</thead>
					<tbody class="divide-y">
						{#each params as [k, v], i (i)}
							<tr>
								<td class="px-3 py-1.5 font-mono break-all">{k}</td>
								<td class="px-3 py-1.5 font-mono break-all">{v}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</section>
</div>
