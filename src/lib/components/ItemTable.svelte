<script lang="ts">
	import type { ItemRow } from '$lib/server/items';

	let { items }: { items: ItemRow[] } = $props();

	let copiedId = $state<number | null>(null);

	async function copy(item: ItemRow) {
		if (!item.body) return;
		try {
			await navigator.clipboard.writeText(item.body);
			copiedId = item.id;
			setTimeout(() => (copiedId = null), 1200);
		} catch {
			// ignore
		}
	}

	const badgeClass = {
		bookmark: 'badge-success',
		note: 'badge-warning',
		snippet: 'badge-info'
	} as const;

	function preview(item: ItemRow): string {
		const src = item.body ?? item.url ?? '';
		return src.length > 120 ? src.slice(0, 120) + '…' : src;
	}
</script>

<div class="overflow-x-auto rounded-box border border-base-300">
	<table class="table table-sm">
		<thead>
			<tr>
				<th class="w-24">Tipe</th>
				<th>Judul / Isi</th>
				<th class="w-40">Tag</th>
				<th class="w-32">Diperbarui</th>
				<th class="w-40 text-right">Aksi</th>
			</tr>
		</thead>
		<tbody>
			{#each items as item (item.id)}
				<tr class="hover">
					<td>
						<div class="flex items-center gap-1">
							<span class="badge {badgeClass[item.type]} badge-sm font-mono">{item.type}</span>
							{#if item.pinned}<span class="text-warning" title="Pinned">★</span>{/if}
						</div>
					</td>

					<td class="max-w-0">
						{#if item.title}
							<div class="truncate font-medium">
								{#if item.url}
									<a
										href={item.url}
										target="_blank"
										rel="noopener noreferrer"
										class="link link-hover"
									>
										{item.title}
									</a>
								{:else}
									<a href="/items/{item.id}" class="link link-hover">{item.title}</a>
								{/if}
							</div>
						{:else if item.url}
							<a
								href={item.url}
								target="_blank"
								rel="noopener noreferrer"
								class="link link-primary block truncate"
							>
								{item.url}
							</a>
						{/if}
						{#if item.body}
							<div class="truncate text-xs opacity-70 {item.type === 'snippet' ? 'font-mono' : ''}">
								{preview(item)}
							</div>
						{/if}
					</td>

					<td>
						{#if item.tags.length > 0}
							<div class="flex flex-wrap gap-1">
								{#each item.tags as tag}
									<a
										class="badge badge-outline badge-sm hover:badge-neutral"
										href="/?tag={encodeURIComponent(tag)}"
									>
										#{tag}
									</a>
								{/each}
							</div>
						{/if}
					</td>

					<td class="whitespace-nowrap text-xs opacity-70">
						{item.updatedAt.slice(0, 16).replace('T', ' ')}
					</td>

					<td>
						<div class="flex justify-end gap-1">
							{#if item.type === 'snippet' && item.body}
								<button
									type="button"
									class="btn btn-ghost btn-xs"
									onclick={() => copy(item)}
									title="Copy ke clipboard"
								>
									{copiedId === item.id ? '✓' : 'Copy'}
								</button>
							{/if}
							<form method="post" action="/?/togglePin" style="display:inline">
								<input type="hidden" name="id" value={item.id} />
								<button
									class="btn btn-ghost btn-xs"
									type="submit"
									title={item.pinned ? 'Unpin' : 'Pin'}
								>
									{item.pinned ? '☆' : '★'}
								</button>
							</form>
							<a class="btn btn-ghost btn-xs" href="/items/{item.id}">Edit</a>
						</div>
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
