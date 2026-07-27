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

	async function copy(e: Event, item: ItemRow) {
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

	function onCardKeydown(e: KeyboardEvent, item: ItemRow) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			onRowClick(item);
		}
	}
</script>

{#if items.length === 0}
	<p class="rounded-box border border-dashed border-base-300 p-4 text-center text-xs opacity-60">
		{emptyText}
	</p>
{:else}
	<!-- Mobile: list kartu (tap-friendly) -->
	<ul class="space-y-2 md:hidden" role="list">
		{#each items as item (item.id)}
			<li>
				<div
					role="button"
					tabindex="0"
					class="block w-full rounded-box border border-base-300 bg-base-200/40 p-3 text-left transition active:bg-base-300"
					onclick={() => onRowClick(item)}
					onkeydown={(e) => onCardKeydown(e, item)}
					aria-label={item.title ?? item.url ?? 'Item'}
				>
					<div class="flex items-start justify-between gap-2">
						<div class="min-w-0 flex-1">
							{#if item.title}
								<div class="truncate text-sm font-medium">
									{#if item.pinned}<span class="mr-1 text-warning" aria-label="Disematkan">★</span>{/if}
									{item.title}
								</div>
							{:else if item.url}
								<div class="truncate text-sm text-primary">
									{#if item.pinned}<span class="mr-1 text-warning" aria-label="Disematkan">★</span>{/if}
									{item.url}
								</div>
							{/if}
							{#if item.body}
								<div class="mt-1 line-clamp-2 text-xs opacity-70 {item.type === 'snippet' ? 'font-mono' : ''}">
									{preview(item)}
								</div>
							{/if}
						</div>

						<div class="flex shrink-0 flex-col items-end gap-1">
							<time class="text-[10px] opacity-50">{item.updatedAt.slice(0, 10)}</time>
						</div>
					</div>

					{#if item.tags.length > 0}
						<div class="mt-2 flex flex-wrap gap-1">
							{#each item.tags.slice(0, 4) as tag}
								<a
									class="badge badge-outline badge-sm"
									href="/?tag={encodeURIComponent(tag)}"
									onclick={(e) => e.stopPropagation()}
								>
									#{tag}
								</a>
							{/each}
							{#if item.tags.length > 4}
								<span class="badge badge-ghost badge-sm">+{item.tags.length - 4}</span>
							{/if}
						</div>
					{/if}

					<div class="mt-2 flex flex-wrap justify-end gap-1">
						{#if item.type === 'snippet' && item.body}
							<button
								type="button"
								class="btn btn-ghost btn-xs tap-target"
								onclick={(e) => copy(e, item)}
								aria-label="Salin snippet"
							>
								{copiedId === item.id ? '✓ Tersalin' : 'Copy'}
							</button>
						{/if}
						{#if item.type === 'bookmark' && item.url}
							<a
								class="btn btn-ghost btn-xs tap-target"
								href={item.url}
								target="_blank"
								rel="noopener noreferrer"
								aria-label="Buka di tab baru"
								onclick={(e) => e.stopPropagation()}
							>
								Buka ↗
							</a>
						{/if}
						<form method="post" action="/?/togglePin">
							<input type="hidden" name="id" value={item.id} />
							<button
								class="btn btn-ghost btn-xs tap-target"
								type="submit"
								aria-label={item.pinned ? 'Lepas pin' : 'Sematkan'}
								onclick={(e) => e.stopPropagation()}
							>
								{item.pinned ? '☆ Unpin' : '★ Pin'}
							</button>
						</form>
					</div>
				</div>
			</li>
		{/each}
	</ul>

	<!-- Desktop: table -->
	<div class="hidden overflow-x-auto rounded-box border border-base-300 md:block">
		<table class="table table-sm">
			<thead>
				<tr class="text-xs uppercase tracking-wider">
					<th class="w-8"><span class="sr-only">Pin</span></th>
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
							{#if item.pinned}<span class="text-warning" aria-label="Disematkan" title="Pinned">★</span>{/if}
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
										aria-label="Salin snippet"
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
										aria-label="Buka di tab baru"
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
										aria-label={item.pinned ? 'Lepas pin' : 'Sematkan'}
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
