<script lang="ts">
	import type { ActionData, PageData } from './$types';
	import CaptureForm from '$lib/components/CaptureForm.svelte';
	import ItemTable from '$lib/components/ItemTable.svelte';
	import ItemDetailModal from '$lib/components/ItemDetailModal.svelte';
	import SectionCards from '$lib/components/section-cards.svelte';
	import ChartAreaInteractive from '$lib/components/chart-area-interactive.svelte';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Switch } from '$lib/components/ui/switch/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import Plus from '@lucide/svelte/icons/plus';
	import Search from '@lucide/svelte/icons/search';
	import type { ItemRow, ItemType } from '$lib/server/items';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// Batas kartu per section di tampilan "Semua" — cegah satu tipe yang besar
	// (mis. Bookmark) mengubur section lain di bawahnya.
	const SECTION_CAP = 6;

	// svelte-ignore state_referenced_locally
	let q = $state(data.filters.q ?? '');
	let selected = $state<ItemRow | null>(null);
	let groupByTag = $state(false);

	interface TagBucket {
		key: string;
		label: string;
		rows: ItemRow[];
	}

	function bucketByTag(rows: ItemRow[]): TagBucket[] {
		const byTag = new Map<string, ItemRow[]>();
		const untagged: ItemRow[] = [];
		for (const row of rows) {
			if (row.tags.length === 0) {
				untagged.push(row);
				continue;
			}
			for (const tag of row.tags) {
				if (!byTag.has(tag)) byTag.set(tag, []);
				byTag.get(tag)!.push(row);
			}
		}
		const buckets = Array.from(byTag.entries())
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([tag, tagRows]) => ({ key: tag, label: `#${tag}`, rows: tagRows }));
		if (untagged.length > 0)
			buckets.push({ key: '__untagged__', label: 'Untagged', rows: untagged });
		return buckets;
	}

	const bookmarks = $derived(data.items.filter((i) => i.type === 'bookmark'));
	const notes = $derived(data.items.filter((i) => i.type === 'note'));
	const snippets = $derived(data.items.filter((i) => i.type === 'snippet'));

	const sections: Array<{
		key: ItemType;
		label: string;
		dot: string;
		rows: ItemRow[];
	}> = $derived([
		{ key: 'bookmark', label: 'Bookmark', dot: 'text-cat-bookmark', rows: bookmarks },
		{ key: 'note', label: 'Note', dot: 'text-cat-note', rows: notes },
		{ key: 'snippet', label: 'Snippet', dot: 'text-cat-snippet', rows: snippets }
	]);

	const shownSections = $derived(
		data.filters.type ? sections.filter((s) => s.key === data.filters.type) : sections
	);

	function selectItem(item: ItemRow) {
		selected = item;
	}
	function closeModal() {
		selected = null;
	}
</script>

{#if data.overview}
	<!-- Overview — dashboard-01 block parts (docs/design.md §Blocks → Admin dashboard). -->
	<div class="mb-6 space-y-4 lg:mb-8">
		<SectionCards
			spend={data.overview.spend}
			items={{ bookmark: bookmarks.length, note: notes.length, snippet: snippets.length }}
			bills={data.overview.bills}
			stickies={data.overview.stickies}
		/>
		<ChartAreaInteractive daily={data.overview.daily} />
	</div>
{/if}

<div class="grid gap-4 sm:gap-6 lg:grid-cols-[380px_1fr]">
	<!-- Desktop: kolom capture setinggi viewport dikurangi header sticky, supaya
	     textarea bisa melar; di mobile/PWA tetap tinggi natural. -->
	<aside
		class="order-2 space-y-3 lg:sticky lg:top-[calc(var(--header-height)+1rem)] lg:order-1 lg:flex lg:h-[calc(100dvh-var(--header-height)-2rem)] lg:flex-col lg:self-start"
	>
		<h2 class="label-mono px-1">Add new</h2>
		<CaptureForm tags={data.tags} />
		{#if form && 'error' in form && form.error}
			<p role="alert" class="text-destructive text-sm">{form.error}</p>
		{/if}
	</aside>

	<section class="order-1 min-w-0 space-y-4 sm:space-y-6 lg:order-2">
		<form method="get" role="search" class="flex w-full flex-wrap gap-2 sm:flex-nowrap">
			{#if data.filters.type}<input type="hidden" name="type" value={data.filters.type} />{/if}
			{#if data.filters.tag}<input type="hidden" name="tag" value={data.filters.tag} />{/if}
			<label for="global-search" class="sr-only">Search items</label>
			<Input
				id="global-search"
				class="min-w-0 flex-1"
				name="q"
				bind:value={q}
				placeholder="Search title, content, or URL…"
				autocomplete="off"
				enterkeyhint="search"
			/>
			<div class="flex w-full gap-2 sm:w-auto">
				<Button class="flex-1 sm:flex-none" type="submit"><Search />Search</Button>
				{#if data.filters.q}
					<Button
						variant="ghost"
						class="flex-1 sm:flex-none"
						href="/?{data.filters.type ? `type=${data.filters.type}` : ''}"
					>
						Reset
					</Button>
				{/if}
			</div>
		</form>

		{#if data.filters.tag}
			<div class="text-muted-foreground flex items-center gap-2 text-sm">
				Tag filter: <Badge variant="secondary">#{data.filters.tag}</Badge>
				<a class="text-primary underline-offset-4 hover:underline" href="/">clear</a>
			</div>
		{/if}

		{#each shownSections as section (section.key)}
			<div>
				<header class="mb-2 flex items-center justify-between px-1">
					<h3 class="flex items-center gap-2 text-sm font-semibold">
						<span class="cat-dot {section.dot}" aria-hidden="true"></span>
						<span>{section.label}</span>
						<Badge variant="outline" class="tabular-nums">{section.rows.length}</Badge>
					</h3>
					{#if !data.filters.type}
						<a
							class="text-muted-foreground hover:text-foreground text-xs"
							href="/?type={section.key}"
						>
							Filter →
						</a>
					{:else}
						<div class="flex items-center gap-2">
							<Label for="group-by-tag" class="text-muted-foreground text-xs font-normal">
								Group by tag
							</Label>
							<Switch id="group-by-tag" bind:checked={groupByTag} />
						</div>
					{/if}
				</header>

				{#if data.filters.type && groupByTag}
					{#each bucketByTag(section.rows) as bucket (bucket.key)}
						<div class="mb-3">
							<h4 class="text-muted-foreground mb-1.5 px-1 text-xs font-semibold">
								{bucket.label} <span class="opacity-60">({bucket.rows.length})</span>
							</h4>
							<ItemTable items={bucket.rows} onRowClick={selectItem} />
						</div>
					{/each}
				{:else}
					<ItemTable
						items={section.rows}
						onRowClick={selectItem}
						emptyText="No {section.label.toLowerCase()}s yet."
						limit={data.filters.type ? undefined : SECTION_CAP}
						moreHref="/?type={section.key}"
					/>
				{/if}
			</div>
		{/each}
	</section>
</div>

<ItemDetailModal item={selected} tags={data.tags} onClose={closeModal} />

<Button
	href="#capture-form"
	size="icon-lg"
	class="fixed right-5 bottom-[calc(1.25rem+env(safe-area-inset-bottom))] z-40 size-14 rounded-full shadow-lg lg:hidden"
	aria-label="Add new"
	title="Add new"
>
	<Plus class="size-6" />
</Button>
