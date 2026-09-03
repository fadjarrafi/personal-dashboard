<script lang="ts">
	import type { ItemRow } from '$lib/server/items';

	let {
		items,
		onRowClick,
		emptyText = 'Belum ada item.',
		limit,
		moreHref
	}: {
		items: ItemRow[];
		onRowClick: (item: ItemRow) => void;
		emptyText?: string;
		/** Batasi jumlah kartu yang ditampilkan (dipakai di tampilan "Semua" agar section besar tidak mengubur section lain). */
		limit?: number;
		/** Link "Lihat semua" saat item dipotong oleh `limit`. */
		moreHref?: string;
	} = $props();

	let copiedId = $state<number | null>(null);

	const shown = $derived(limit ? items.slice(0, limit) : items);
	const hiddenCount = $derived(limit && items.length > limit ? items.length - limit : 0);

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
		return src.length > 140 ? src.slice(0, 140) + '…' : src;
	}

	function shortDate(iso: string): string {
		return iso.slice(0, 10);
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
	<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
		{#each shown as item (item.id)}
			<div
				role="button"
				tabindex="0"
				class="flex flex-col rounded-box border border-base-300 bg-base-200/40 p-3 text-left transition hover:bg-base-300/40 active:bg-base-300"
				onclick={() => onRowClick(item)}
				onkeydown={(e) => onCardKeydown(e, item)}
				aria-label={item.title ?? item.url ?? 'Item'}
			>
				<div class="mb-1 flex items-start justify-between gap-2">
					<div class="min-w-0 flex-1">
						{#if item.title}
							<div class="truncate text-sm font-medium">{item.title}</div>
						{:else if item.url}
							<div class="truncate text-sm text-primary">{item.url}</div>
						{/if}
					</div>
					{#if item.pinned}
						<span class="shrink-0 text-warning" aria-label="Disematkan" title="Pinned">★</span>
					{/if}
				</div>

				{#if item.body}
					<p class="mb-2 line-clamp-3 flex-1 text-xs opacity-70 {item.type === 'snippet' ? 'font-mono' : ''}">
						{preview(item)}
					</p>
				{:else}
					<div class="flex-1"></div>
				{/if}

				{#if item.tags.length > 0}
					<div class="mb-2 flex flex-wrap gap-1">
						{#each item.tags.slice(0, 3) as tag}
							<a
								class="badge badge-outline badge-sm"
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

				<div class="mt-auto flex items-center justify-between gap-2 border-t border-base-300 pt-2">
					<time class="font-mono text-[10px] opacity-50">{shortDate(item.updatedAt)}</time>
					<div class="flex flex-wrap justify-end gap-1">
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
								{item.pinned ? '☆' : '★'}
							</button>
						</form>
					</div>
				</div>
			</div>
		{/each}

		{#if hiddenCount > 0 && moreHref}
			<a
				href={moreHref}
				class="flex min-h-[8rem] flex-col items-center justify-center gap-1 rounded-box border border-dashed border-base-300 p-3 text-center text-sm opacity-70 transition hover:bg-base-300/40 hover:opacity-100"
			>
				<span class="font-mono text-lg tabular-nums">+{hiddenCount}</span>
				<span>Lihat semua →</span>
			</a>
		{/if}
	</div>
{/if}
