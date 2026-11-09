<script lang="ts">
	import type { ItemRow } from '$lib/server/items';
	import Star from '@lucide/svelte/icons/star';
	import Pin from '@lucide/svelte/icons/pin';
	import PinOff from '@lucide/svelte/icons/pin-off';
	import Copy from '@lucide/svelte/icons/copy';
	import Check from '@lucide/svelte/icons/check';
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { AnimatedGroup } from '$lib/components/motion';

	let {
		items,
		onRowClick,
		emptyText = 'No items yet.',
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
	<p class="text-muted-foreground rounded-lg border border-dashed p-4 text-center text-xs">
		{emptyText}
	</p>
{:else}
	<AnimatedGroup class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
		{#each shown as item (item.id)}
			<div
				role="button"
				tabindex="0"
				class="bg-card hover:bg-accent/60 hover:border-ring/40 flex flex-col rounded-lg border p-3 text-left transition-colors duration-150"
				onclick={() => onRowClick(item)}
				onkeydown={(e) => onCardKeydown(e, item)}
				aria-label={item.title ?? item.url ?? 'Item'}
			>
				{#if item.type === 'bookmark' && item.previewImageUrl}
					<img
						src={item.previewImageUrl}
						alt=""
						loading="lazy"
						class="mb-2 h-28 w-full rounded-md object-cover"
						onerror={(e) => ((e.currentTarget as HTMLImageElement).style.display = 'none')}
					/>
				{/if}

				<div class="mb-1 flex items-start justify-between gap-2">
					<div class="flex min-w-0 flex-1 items-center gap-1.5">
						{#if item.type === 'bookmark' && item.faviconUrl}
							<img
								src={item.faviconUrl}
								alt=""
								loading="lazy"
								class="h-4 w-4 shrink-0"
								onerror={(e) => ((e.currentTarget as HTMLImageElement).style.display = 'none')}
							/>
						{/if}
						{#if item.title}
							<div class="truncate text-sm font-medium">{item.title}</div>
						{:else if item.url}
							<div class="text-primary truncate text-sm">{item.url}</div>
						{/if}
					</div>
					{#if item.pinned}
						<Star class="text-primary size-4 shrink-0 fill-current" aria-label="Pinned" />
					{/if}
				</div>

				{#if item.body}
					<p class="text-muted-foreground mb-2 line-clamp-3 flex-1 text-xs">
						{preview(item)}
					</p>
				{:else}
					<div class="flex-1"></div>
				{/if}

				{#if item.tags.length > 0}
					<div class="mb-2 flex flex-wrap gap-1">
						{#each item.tags.slice(0, 3) as tag (tag)}
							<Badge
								variant="outline"
								href="/?tag={encodeURIComponent(tag)}"
								onclick={(e: MouseEvent) => e.stopPropagation()}
							>
								#{tag}
							</Badge>
						{/each}
						{#if item.tags.length > 3}
							<Badge variant="secondary">+{item.tags.length - 3}</Badge>
						{/if}
					</div>
				{/if}

				<div class="mt-auto flex items-center justify-between gap-2 border-t pt-2">
					<time class="text-muted-foreground text-[11px]">{shortDate(item.updatedAt)}</time>
					<div class="flex flex-wrap justify-end gap-1">
						{#if item.type === 'snippet' && item.body}
							<Button
								variant="ghost"
								size="sm"
								class="tap-target"
								onclick={(e: MouseEvent) => copy(e, item)}
								aria-label="Copy snippet"
							>
								{#if copiedId === item.id}<Check />Copied{:else}<Copy />Copy{/if}
							</Button>
						{/if}
						{#if item.type === 'bookmark' && item.url}
							<Button
								variant="ghost"
								size="sm"
								class="tap-target"
								href={item.url}
								target="_blank"
								rel="noopener noreferrer"
								aria-label="Open in new tab"
								onclick={(e: MouseEvent) => e.stopPropagation()}
							>
								<ExternalLink />Open
							</Button>
						{/if}
						<form method="post" action="/?/togglePin">
							<input type="hidden" name="id" value={item.id} />
							<Button
								variant="ghost"
								size="icon-sm"
								class="tap-target"
								type="submit"
								aria-label={item.pinned ? 'Unpin' : 'Pin'}
								title={item.pinned ? 'Unpin' : 'Pin'}
								onclick={(e: MouseEvent) => e.stopPropagation()}
							>
								{#if item.pinned}<PinOff />{:else}<Pin />{/if}
							</Button>
						</form>
					</div>
				</div>
			</div>
		{/each}

		{#if hiddenCount > 0 && moreHref}
			<a
				href={moreHref}
				class="text-muted-foreground hover:bg-accent/60 hover:text-foreground flex min-h-[8rem] flex-col items-center justify-center gap-1 rounded-lg border border-dashed p-3 text-center text-sm transition-colors"
			>
				<span class="text-lg tabular-nums">+{hiddenCount}</span>
				<span>View all →</span>
			</a>
		{/if}
	</AnimatedGroup>
{/if}
