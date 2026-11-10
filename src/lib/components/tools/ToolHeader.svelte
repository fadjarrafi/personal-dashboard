<script lang="ts">
	import { tools, categories } from '$lib/tools';
	import { Button } from '$lib/components/ui/button/index.js';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';

	let { slug }: { slug: string } = $props();

	const tool = $derived(tools.find((t) => t.slug === slug));
	const category = $derived(categories.find((c) => c.id === tool?.category));
</script>

<svelte:head><title>{tool?.label ?? 'Tools'} · Tools</title></svelte:head>

<header class="mb-4 space-y-1 border-b pb-3">
	<Button
		variant="ghost"
		size="sm"
		class="-ms-2"
		href={category ? `/tools?tab=${category.id}` : '/tools'}
		><ArrowLeft />{category?.label ?? 'Tools'}</Button
	>
	<h1 class="text-lg font-semibold sm:text-xl">{tool?.label}</h1>
	{#if tool}<p class="text-muted-foreground text-sm">{tool.description}</p>{/if}
</header>
