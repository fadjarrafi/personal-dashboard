<script lang="ts">
	import { marked } from 'marked';
	import ToolHeader from '$lib/components/tools/ToolHeader.svelte';
	import Segmented from '$lib/components/tools/Segmented.svelte';
	import TextInput from '$lib/components/tools/TextInput.svelte';
	import Output from '$lib/components/tools/Output.svelte';
	import SandboxFrame from '$lib/components/tools/SandboxFrame.svelte';
	import { Checkbox } from '$lib/components/ui/checkbox/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { PREVIEW_CSS } from '$lib/tool-utils';

	let input = $state(`# Hello Markdown

Some **bold**, _italic_, \`code\`, and a [link](https://example.com).

- [x] task list
- [ ] GFM tables:

| Name | Qty |
| ---- | --: |
| Kopi |   2 |

\`\`\`js
console.log('fenced code');
\`\`\`

> Blockquote
`);
	let view = $state<'preview' | 'html'>('preview');
	let breaks = $state(false);

	const html = $derived(marked.parse(input, { gfm: true, breaks, async: false }) as string);
	// Preview dirender di iframe sandbox tanpa script, jadi HTML mentah di Markdown tidak berbahaya.
	const doc = $derived(`<!doctype html><meta charset="utf-8"><style>${PREVIEW_CSS}</style>${html}`);
</script>

<ToolHeader slug="markdown" />

<div class="space-y-3">
	<div class="flex flex-wrap items-center gap-3">
		<Segmented
			bind:value={view}
			options={[
				{ value: 'preview', label: 'Preview' },
				{ value: 'html', label: 'HTML' }
			]}
			ariaLabel="View"
		/>
		<div class="flex items-center gap-2">
			<Checkbox id="md-breaks" bind:checked={breaks} />
			<Label for="md-breaks" class="text-xs font-normal">Line breaks as &lt;br&gt;</Label>
		</div>
	</div>
	<div class="grid gap-4 lg:grid-cols-2">
		<TextInput bind:value={input} label="Markdown" height="h-[28rem]" />
		{#if view === 'preview'}
			<section class="min-w-0 space-y-2">
				<div class="flex min-h-7 items-center"><span class="label-mono">Preview</span></div>
				<SandboxFrame html={doc} class="h-[28rem]" title="Markdown preview" />
			</section>
		{:else}
			<Output value={html} label="HTML" height="h-[28rem]" />
		{/if}
	</div>
</div>
