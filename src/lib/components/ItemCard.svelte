<script lang="ts">
	import type { ItemRow } from '$lib/server/items';

	let { item }: { item: ItemRow } = $props();
	let copied = $state(false);

	async function copyBody() {
		if (!item.body) return;
		try {
			await navigator.clipboard.writeText(item.body);
			copied = true;
			setTimeout(() => (copied = false), 1200);
		} catch {
			// ignore
		}
	}

	const badgeClass = {
		bookmark: 'badge-success',
		note: 'badge-warning',
		snippet: 'badge-info'
	} as const;
</script>

<article class="card bg-base-200 transition hover:bg-base-300">
	<div class="card-body p-3">
		<header class="flex items-start justify-between gap-2">
			<div class="min-w-0">
				<div class="flex items-center gap-2 text-xs">
					<span class="badge {badgeClass[item.type]} badge-sm font-mono">{item.type}</span>
					{#if item.pinned}<span class="text-warning">★</span>{/if}
					<time class="opacity-60">{item.updatedAt.slice(0, 16).replace('T', ' ')}</time>
				</div>
				{#if item.title}
					<h2 class="mt-1 truncate text-base font-medium">
						{#if item.url}
							<a href={item.url} target="_blank" rel="noopener noreferrer" class="link link-hover">
								{item.title}
							</a>
						{:else}
							<a href="/items/{item.id}" class="link link-hover">{item.title}</a>
						{/if}
					</h2>
				{:else if item.url}
					<a
						href={item.url}
						target="_blank"
						rel="noopener noreferrer"
						class="link link-primary mt-1 block truncate text-base"
					>
						{item.url}
					</a>
				{/if}
			</div>

			<div class="flex shrink-0 items-center gap-1">
				{#if item.type === 'snippet' && item.body}
					<button type="button" class="btn btn-ghost btn-xs" onclick={copyBody}>
						{copied ? 'Tersalin' : 'Copy'}
					</button>
				{/if}
				<form method="post" action="/?/togglePin" style="display:inline">
					<input type="hidden" name="id" value={item.id} />
					<button class="btn btn-ghost btn-xs" type="submit" title={item.pinned ? 'Unpin' : 'Pin'}>
						{item.pinned ? '☆' : '★'}
					</button>
				</form>
				<a class="btn btn-ghost btn-xs" href="/items/{item.id}">Edit</a>
			</div>
		</header>

		{#if item.body}
			{#if item.type === 'snippet'}
				<pre
					class="mockup-code max-h-64 overflow-auto text-xs"><code>{item.body}</code></pre>
			{:else}
				<p class="mt-1 whitespace-pre-wrap text-sm opacity-90">{item.body}</p>
			{/if}
		{/if}

		{#if item.tags.length > 0}
			<div class="mt-2 flex flex-wrap gap-1">
				{#each item.tags as tag}
					<a class="badge badge-outline badge-sm hover:badge-neutral" href="/?tag={encodeURIComponent(tag)}">
						#{tag}
					</a>
				{/each}
			</div>
		{/if}
	</div>
</article>
