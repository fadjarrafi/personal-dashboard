<script lang="ts">
	import type { PageData } from './$types';

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
	<header class="flex items-center justify-between gap-2 px-1">
		<h1 class="text-lg font-semibold sm:text-xl">Boards</h1>
		<form method="post" action="?/create" class="flex items-center gap-2">
			<input
				class="input input-bordered input-sm"
				name="title"
				placeholder="New board title"
				autocomplete="off"
			/>
			<button class="btn btn-primary btn-sm" type="submit">New board</button>
		</form>
	</header>

	{#if data.boards.length === 0}
		<p class="rounded-box border border-dashed border-base-300 p-6 text-center text-sm opacity-60">
			No boards yet. Create one to start free-form brainstorming.
		</p>
	{:else}
		<ul class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" role="list">
			{#each data.boards as b (b.id)}
				<li class="rounded-box border border-base-300 bg-base-200/40 p-3">
					<a href="/boards/{b.id}" class="block">
						<div class="truncate text-sm font-medium">{b.title}</div>
						<div class="mt-0.5 text-xs opacity-60">Updated {relTime(b.updatedAt)}</div>
					</a>
					<div class="mt-2 flex justify-end gap-2">
						<form method="post" action="?/archive">
							<input type="hidden" name="id" value={b.id} />
							<button class="btn btn-ghost btn-xs tap-target" type="submit">Archive</button>
						</form>
						<form
							method="post"
							action="?/delete"
							onsubmit={(e) => {
								if (!confirm('Delete this board and its contents?')) e.preventDefault();
							}}
						>
							<input type="hidden" name="id" value={b.id} />
							<button class="btn btn-error btn-outline btn-xs tap-target" type="submit">Delete</button
							>
						</form>
					</div>
				</li>
			{/each}
		</ul>
	{/if}
</div>
