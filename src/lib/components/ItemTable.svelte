<script lang="ts">
	import type { ItemRow } from '$lib/server/items';

	let {
		items,
		onRowClick,
		emptyText = 'Belum ada item.'
	}: {
		items: ItemRow[];
		onRowClick: (item: ItemRow) => void;
		emptyText?: string;
	} = $props();

	let copiedId = $state<number | null>(null);

	async function copy(e: MouseEvent, item: ItemRow) {
		e.stopPropagation();
		if (!item.body) return;
		try {
			await navigator.clipboard.writeText(item.body);
			copiedId = item.id;
			setTimeout(() => (copiedId = null), 1200);
		} catch {
			// ignore
		}
	}

	function preview(item: ItemRow): string {
		const src = item.body ?? item.url ?? '';
		return src.length > 100 ? src.slice(0, 100) + '…' : src;
	}
</script>

{#if items.length === 0}
	<p class="rounded-box border border-dashed border-base-300 p-4 text-center text-xs opacity-60">
		{emptyText}
	</p>
{:else}
	<div class="overflow-x-auto rounded-box border border-base-300">
		<table class="table table-sm">
			<thead>
				<tr class="text-xs uppercase tracking-wider">
					<th class="w-8"></th>
					<th>Judul / Isi</th>
					<th class="w-44">Tag</th>
					<th class="w-32">Diperbarui</th>
					<th class="w-36 text-right">Aksi</th>
				</tr>
			</thead>
			<tbody>
				{#each items as item (item.id)}
					<tr
						class="cursor-pointer hover"
						onclick={() => onRowClick(item)}
						title="Klik untuk detail"
					>
						<td class="text-center">
							{#if item.pinned}<span class="text-warning" title="Pinned">★</span>{/if}
						</td>

						<td class="max-w-0">
							{#if item.title}
								<div class="truncate font-medium">{item.title}</div>
							{:else if item.url}
								<div class="truncate text-primary">{item.url}</div>
							{/if}
							{#if item.body}
								<div class="truncate text-xs opacity-60 {item.type === 'snippet' ? 'font-mono' : ''}">
									{preview(item)}
								</div>
							{/if}
						</td>

						<td>
							{#if item.tags.length > 0}
								<div class="flex flex-wrap gap-1">
									{#each item.tags.slice(0, 3) as tag}
										<a
											class="badge badge-outline badge-sm hover:badge-neutral"
											href="/?tag={encodeURIComponent(tag)}"
											onclick={(e) => e.stopPropagation()}
										>
											#{tag}
										</a>
									{/each}
									{#if item.tags.length > 3}
										<span class="badge badge-ghost badge-sm">+{item.tags.length - 3}</span>
									{/if}
								</div>
							{/if}
						</td>

						<td class="whitespace-nowrap text-xs opacity-60">
							{item.updatedAt.slice(0, 16).replace('T', ' ')}
						</td>

						<td onclick={(e) => e.stopPropagation()}>
							<div class="flex justify-end gap-1">
								{#if item.type === 'snippet' && item.body}
									<button
										type="button"
										class="btn btn-ghost btn-xs"
										onclick={(e) => copy(e, item)}
										title="Copy ke clipboard"
									>
										{copiedId === item.id ? '✓' : 'Copy'}
									</button>
								{/if}
								{#if item.type === 'bookmark' && item.url}
									<a
										class="btn btn-ghost btn-xs"
										href={item.url}
										target="_blank"
										rel="noopener noreferrer"
										title="Buka di tab baru"
										onclick={(e) => e.stopPropagation()}
									>
										↗
									</a>
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
							</div>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}
