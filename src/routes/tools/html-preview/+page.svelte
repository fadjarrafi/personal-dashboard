<script lang="ts">
	import ToolHeader from '$lib/components/tools/ToolHeader.svelte';
	import Segmented from '$lib/components/tools/Segmented.svelte';
	import TextInput from '$lib/components/tools/TextInput.svelte';
	import SandboxFrame from '$lib/components/tools/SandboxFrame.svelte';
	import { Checkbox } from '$lib/components/ui/checkbox/index.js';
	import { Label } from '$lib/components/ui/label/index.js';

	let html = $state(`<!doctype html>
<html>
<head>
  <style>
    body { font-family: system-ui; display: grid; place-items: center; min-height: 90vh; }
    .card { padding: 24px; border-radius: 12px; box-shadow: 0 4px 20px #0002; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Hello 👋</h1>
    <p>Edit the HTML on the left.</p>
  </div>
</body>
</html>`);
	let width = $state<'100%' | '768px' | '375px'>('100%');
	let scripts = $state(false);

	// Render ulang dengan debounce kecil supaya iframe tidak reload di setiap ketikan.
	let rendered = $state('');
	$effect(() => {
		const v = html;
		const t = setTimeout(() => (rendered = v), 250);
		return () => clearTimeout(t);
	});
</script>

<ToolHeader slug="html-preview" />

<div class="space-y-3">
	<div class="flex flex-wrap items-center gap-3">
		<Segmented
			bind:value={width}
			options={[
				{ value: '100%', label: 'Full' },
				{ value: '768px', label: 'Tablet' },
				{ value: '375px', label: 'Mobile' }
			]}
			ariaLabel="Preview width"
		/>
		<div class="flex items-center gap-2">
			<Checkbox id="hp-scripts" bind:checked={scripts} />
			<Label for="hp-scripts" class="text-xs font-normal">Allow scripts (sandboxed)</Label>
		</div>
	</div>
	<div class="grid gap-4 xl:grid-cols-2">
		<TextInput bind:value={html} label="HTML" height="h-[32rem]" />
		<section class="min-w-0 space-y-2">
			<div class="flex min-h-7 items-center"><span class="label-mono">Preview · {width}</span></div>
			{#key scripts}
				<SandboxFrame html={rendered} {scripts} {width} class="h-[32rem]" title="HTML preview" />
			{/key}
		</section>
	</div>
	<p class="text-muted-foreground text-xs">
		The preview runs in an isolated, opaque-origin iframe — it can't read this dashboard's cookies
		or session, even with scripts enabled.
	</p>
</div>
