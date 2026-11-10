<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { tools, categories, toolsIn, type ToolCategory, type Tool } from '$lib/tools';
	import * as Tabs from '$lib/components/ui/tabs/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { AnimatedGroup } from '$lib/components/motion';
	import SearchIcon from '@lucide/svelte/icons/search';

	const ids = categories.map((c) => c.id);

	// Tab aktif disimpan di ?tab= supaya tombol back dari halaman tool kembali ke tab yang sama.
	const active = $derived.by((): ToolCategory => {
		const t = page.url.searchParams.get('tab') as ToolCategory | null;
		return t && ids.includes(t) ? t : 'dev';
	});

	function selectTab(v: string) {
		const url = new URL(page.url);
		url.searchParams.set('tab', v);
		goto(url, { replaceState: true, noScroll: true, keepFocus: true });
	}

	let query = $state('');
	const q = $derived(query.trim().toLowerCase());
	const results = $derived(
		q
			? tools.filter((t) =>
					`${t.label} ${t.description} ${t.keywords.join(' ')}`.toLowerCase().includes(q)
				)
			: []
	);
	const categoryLabel = Object.fromEntries(categories.map((c) => [c.id, c.label]));
</script>

<svelte:head><title>Tools</title></svelte:head>

{#snippet grid(list: Tool[], showCategory = false)}
	<AnimatedGroup class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
		{#each list as t (t.slug)}
			<a
				href="/tools/{t.slug}"
				class="bg-card hover:border-ring/40 hover:bg-accent/40 block h-full rounded-lg border p-3 transition-colors"
			>
				<div class="flex items-baseline justify-between gap-2">
					<span class="text-sm font-medium">{t.label}</span>
					{#if showCategory}<span class="label-mono">{categoryLabel[t.category]}</span>{/if}
				</div>
				<div class="text-muted-foreground mt-0.5 text-xs">{t.description}</div>
			</a>
		{/each}
	</AnimatedGroup>
{/snippet}

<div class="space-y-4">
	<div class="flex flex-wrap items-center justify-between gap-3">
		<p class="text-muted-foreground px-1 text-sm">
			{tools.length} utilities that run entirely in the browser — no data is sent to the server.
		</p>
		<div class="relative w-full sm:w-64">
			<SearchIcon
				class="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
			/>
			<Input
				type="search"
				class="ps-8"
				placeholder="Filter tools…"
				aria-label="Filter tools"
				bind:value={query}
			/>
		</div>
	</div>

	{#if q}
		{#if results.length}
			{@render grid(results, true)}
		{:else}
			<p class="text-muted-foreground px-1 text-sm">No tool matches “{query}”.</p>
		{/if}
	{:else}
		<Tabs.Root value={active} onValueChange={selectTab}>
			<div class="-mx-1 overflow-x-auto px-1 pb-1">
				<Tabs.List>
					{#each categories as c (c.id)}
						<Tabs.Trigger value={c.id}>
							{c.label}
							<span class="text-muted-foreground text-xs tabular-nums">{toolsIn(c.id).length}</span>
						</Tabs.Trigger>
					{/each}
				</Tabs.List>
			</div>
			{#each categories as c (c.id)}
				<Tabs.Content value={c.id} class="pt-2">
					{@render grid(toolsIn(c.id))}
				</Tabs.Content>
			{/each}
		</Tabs.Root>
	{/if}
</div>
