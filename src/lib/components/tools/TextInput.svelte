<!-- Textarea input standar untuk /tools/*: label mono + tombol Clear. -->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { Button } from '$lib/components/ui/button/index.js';

	let {
		value = $bindable(''),
		label = 'Input',
		placeholder = '',
		height = 'h-56',
		mono = true,
		actions
	}: {
		value: string;
		label?: string;
		placeholder?: string;
		height?: string;
		mono?: boolean;
		actions?: Snippet;
	} = $props();
</script>

<section class="min-w-0 space-y-2">
	<div class="flex min-h-7 items-center justify-between gap-2">
		<span class="label-mono">{label}</span>
		<div class="flex items-center gap-1">
			{@render actions?.()}
			<Button variant="ghost" size="xs" onclick={() => (value = '')} disabled={!value}>Clear</Button
			>
		</div>
	</div>
	<Textarea
		class="bg-well {height} {mono ? 'font-mono text-xs' : ''}"
		bind:value
		spellcheck="false"
		{placeholder}
		aria-label={label}
	/>
</section>
