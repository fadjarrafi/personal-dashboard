<script lang="ts">
	import { tools } from '$lib/tools';

	let { slug }: { slug: string } = $props();

	const tool = $derived(tools.find((t) => t.slug === slug));
</script>

<svelte:head><title>{tool?.label ?? 'Dev Tools'} · Dev Tools</title></svelte:head>

<header class="mb-4 border-b border-base-300 pb-3">
	<a href="/tools" class="label-mono hover:underline">← Dev Tools</a>
	<h1 class="mt-1 text-lg font-semibold sm:text-xl">{tool?.label}</h1>
	{#if tool}<p class="text-sm opacity-60">{tool.description}</p>{/if}
</header>
