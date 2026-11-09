<script lang="ts">
	import { tools } from '$lib/tools';
	import { AnimatedGroup } from '$lib/components/motion';
</script>

<svelte:head><title>Dev Tools</title></svelte:head>

<div class="space-y-4">
	<p class="text-muted-foreground px-1 text-sm">
		Small utilities that run entirely in the browser — no data is sent to the server.
	</p>

	<AnimatedGroup class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
		{#each tools as t (t.slug)}
			<a
				href="/tools/{t.slug}"
				class="bg-card hover:border-ring/40 hover:bg-accent/40 block h-full rounded-lg border p-3 transition-colors"
			>
				<div class="text-sm font-medium">{t.label}</div>
				<div class="text-muted-foreground mt-0.5 text-xs">{t.description}</div>
			</a>
		{/each}
	</AnimatedGroup>
</div>
