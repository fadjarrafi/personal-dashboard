<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { tick } from 'svelte';
	import { dndzone } from 'svelte-dnd-action';
	import Plus from '@lucide/svelte/icons/plus';
	import Search from '@lucide/svelte/icons/search';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import StickyCard from '$lib/components/StickyCard.svelte';
	import { stickyPlainText } from '$lib/stickies';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let q = $state('');
	// Live text per sticky (kept in sync by the cards) so search sees unsaved edits.
	let edited = $state<Record<number, string>>({});
	// Same for colour: dnd remounts cards from list data, which is stale until the next load.
	let colors = $state<Record<number, string>>({});

	// Local copy so drag-and-drop can reorder optimistically; resynced from the
	// server after any invalidation (create/delete/failed reorder).
	let list = $state(data.stickies);
	$effect(() => {
		list = data.stickies;
	});

	const flipDurationMs = 150;

	function text(id: number, html: string) {
		return stickyPlainText(edited[id] ?? html).toLowerCase();
	}

	const needle = $derived(q.trim().toLowerCase());
	const visible = $derived(
		needle ? list.filter((s) => text(s.id, s.content).includes(needle)) : list
	);
	// Reordering a filtered subset would scramble the hidden ones, so drag only on the full list.
	const canDrag = $derived(!needle);

	function handleConsider(e: CustomEvent<{ items: typeof list }>) {
		list = e.detail.items;
	}

	async function handleFinalize(e: CustomEvent<{ items: typeof list }>) {
		list = e.detail.items;
		try {
			const res = await fetch('/stickies/reorder', {
				method: 'PATCH',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ orderedIds: list.map((s) => s.id) })
			});
			if (!res.ok) throw new Error('reorder failed');
		} catch {
			await invalidateAll(); // roll back to server truth
		}
	}
</script>

<div class="space-y-4">
	<div class="flex items-center justify-end gap-2">
		<div class="relative">
			<Search
				class="text-muted-foreground pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2"
			/>
			<Input
				type="search"
				class="h-9 w-40 ps-8 sm:w-56"
				placeholder="Search stickies…"
				aria-label="Search stickies"
				bind:value={q}
			/>
		</div>
		<form
			method="post"
			action="?/create"
			use:enhance={() =>
				async ({ update }) => {
					q = '';
					await update();
					await tick();
					document.querySelector<HTMLElement>('.sticky-editor')?.focus();
				}}
		>
			<Button type="submit" class="tap-target lg:min-h-0"><Plus />Add sticky</Button>
		</form>
	</div>

	{#if data.stickies.length === 0}
		<p class="text-muted-foreground py-16 text-center text-sm">
			No stickies yet. Add one to jot something down.
		</p>
	{:else if visible.length === 0}
		<p class="text-muted-foreground py-16 text-center text-sm">No stickies match “{q}”.</p>
	{:else}
		<div
			class="grid grid-cols-[repeat(auto-fill,minmax(16rem,1fr))] gap-4"
			use:dndzone={{
				items: visible,
				flipDurationMs,
				dragDisabled: !canDrag,
				dropTargetStyle: {}
			}}
			onconsider={handleConsider}
			onfinalize={handleFinalize}
		>
			{#each visible as s (s.id)}
				<div>
					<StickyCard
						id={s.id}
						content={edited[s.id] ?? s.content}
						color={colors[s.id] ?? s.color}
						draggable={canDrag}
						onedit={(id, html) => (edited[id] = html)}
						oncolor={(id, c) => (colors[id] = c)}
					/>
				</div>
			{/each}
		</div>
	{/if}
</div>
