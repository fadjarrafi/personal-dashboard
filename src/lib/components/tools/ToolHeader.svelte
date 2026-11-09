<script lang="ts">
	import { tools } from '$lib/tools';
	import { Button } from '$lib/components/ui/button/index.js';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';

	let { slug }: { slug: string } = $props();

	const tool = $derived(tools.find((t) => t.slug === slug));
</script>

<svelte:head><title>{tool?.label ?? 'Dev Tools'} · Dev Tools</title></svelte:head>

<header class="mb-4 space-y-1 border-b pb-3">
	<Button variant="ghost" size="sm" class="-ms-2" href="/tools"><ArrowLeft />Dev Tools</Button>
	<h1 class="text-lg font-semibold sm:text-xl">{tool?.label}</h1>
	{#if tool}<p class="text-muted-foreground text-sm">{tool.description}</p>{/if}
</header>
