<script lang="ts">
	import type { PageData } from './$types';
	import ConfirmAction from '$lib/components/ConfirmAction.svelte';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { AnimatedGroup } from '$lib/components/motion';
	import Plus from '@lucide/svelte/icons/plus';
	import Archive from '@lucide/svelte/icons/archive';
	import Trash2 from '@lucide/svelte/icons/trash-2';

	let { data }: { data: PageData } = $props();

	function relTime(iso: string): string {
		const diffMs = Date.now() - new Date(iso).getTime();
		const mins = Math.round(diffMs / 60_000);
		if (mins < 1) return 'just now';
		if (mins < 60) return `${mins} min ago`;
		const hours = Math.round(mins / 60);
		if (hours < 24) return `${hours} h ago`;
		const days = Math.round(hours / 24);
		return `${days} day(s) ago`;
	}
</script>

<div class="space-y-4">
	<header class="flex items-center justify-end gap-2 px-1">
		<form method="post" action="?/create" class="flex items-center gap-2">
			<Input
				class="h-8"
				name="title"
				placeholder="New board title"
				aria-label="New board title"
				autocomplete="off"
			/>
			<Button size="sm" type="submit"><Plus />New board</Button>
		</form>
	</header>

	{#if data.boards.length === 0}
		<p class="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
			No boards yet. Create one to start free-form brainstorming.
		</p>
	{:else}
		<AnimatedGroup class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
			{#each data.boards as b (b.id)}
				<div class="bg-card hover:border-ring/40 rounded-lg border p-3 transition-colors">
					<a href="/boards/{b.id}" class="block">
						<div class="truncate text-sm font-medium">{b.title}</div>
						<div class="text-muted-foreground mt-0.5 text-xs">Updated {relTime(b.updatedAt)}</div>
					</a>
					<div class="mt-2 flex justify-end gap-2">
						<form method="post" action="?/archive">
							<input type="hidden" name="id" value={b.id} />
							<Button variant="ghost" size="sm" class="tap-target" type="submit">
								<Archive />Archive
							</Button>
						</form>
						<ConfirmAction
							action="?/delete"
							fields={{ id: b.id }}
							title="Delete this board?"
							description="The board and all its contents are removed. This cannot be undone."
							confirmLabel="Delete"
							destructive
							size="sm"
							class="tap-target"
						>
							<Trash2 />Delete
						</ConfirmAction>
					</div>
				</div>
			{/each}
		</AnimatedGroup>
	{/if}
</div>
