<script lang="ts">
	import type { ActionData, PageData } from './$types';
	import CaptureForm from '$lib/components/CaptureForm.svelte';
	import ItemTable from '$lib/components/ItemTable.svelte';
	import ItemDetailModal from '$lib/components/ItemDetailModal.svelte';
	import type { ItemRow, ItemType } from '$lib/server/items';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// svelte-ignore state_referenced_locally
	let q = $state(data.filters.q ?? '');
	let selected = $state<ItemRow | null>(null);

	const bookmarks = $derived(data.items.filter((i) => i.type === 'bookmark'));
	const notes = $derived(data.items.filter((i) => i.type === 'note'));
	const snippets = $derived(data.items.filter((i) => i.type === 'snippet'));

	const sections: Array<{
		key: ItemType;
		label: string;
		dot: string;
		badge: string;
		rows: ItemRow[];
	}> = $derived([
		{ key: 'bookmark', label: 'Bookmark', dot: 'text-[--color-cat-bookmark]', badge: 'badge-success', rows: bookmarks },
		{ key: 'note', label: 'Note', dot: 'text-[--color-cat-note]', badge: 'badge-warning', rows: notes },
		{ key: 'snippet', label: 'Snippet', dot: 'text-[--color-cat-snippet]', badge: 'badge-info', rows: snippets }
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

<div class="grid gap-4 sm:gap-6 lg:grid-cols-[380px_1fr]">
	<aside class="order-2 space-y-3 lg:order-1 lg:sticky lg:top-4 lg:self-start">
		<div class="flex items-center justify-between px-1">
			<h2 class="text-xs font-semibold uppercase tracking-wider opacity-60">Tambah baru</h2>
		</div>
		<CaptureForm tags={data.tags} />
		{#if form && 'error' in form && form.error}
			<div role="alert" class="alert alert-error py-2 text-sm">{form.error}</div>
		{/if}

		<div class="rounded-box border border-base-300 bg-base-200/40 p-3 text-xs opacity-70">
			<div class="mb-1 font-semibold opacity-80">Total item</div>
			<div class="flex justify-between gap-2">
				<span class="flex items-center gap-1.5"
					><span class="cat-dot text-[--color-cat-bookmark]" aria-hidden="true"></span>Bookmark</span
				><span class="font-mono tabular-nums">{bookmarks.length}</span>
			</div>
			<div class="flex justify-between gap-2">
				<span class="flex items-center gap-1.5"
					><span class="cat-dot text-[--color-cat-note]" aria-hidden="true"></span>Note</span
				><span class="font-mono tabular-nums">{notes.length}</span>
			</div>
			<div class="flex justify-between gap-2">
				<span class="flex items-center gap-1.5"
					><span class="cat-dot text-[--color-cat-snippet]" aria-hidden="true"></span>Snippet</span
				><span class="font-mono tabular-nums">{snippets.length}</span>
			</div>
			<div class="divider my-1"></div>
			<a class="link link-hover" href="/export">Export JSON →</a>
		</div>
	</aside>

	<section class="order-1 min-w-0 space-y-4 sm:space-y-6 lg:order-2">
		<form method="get" role="search" class="flex w-full flex-wrap gap-2 sm:flex-nowrap">
			{#if data.filters.type}<input type="hidden" name="type" value={data.filters.type} />{/if}
			{#if data.filters.tag}<input type="hidden" name="tag" value={data.filters.tag} />{/if}
			<label for="global-search" class="sr-only">Cari item</label>
			<input
				id="global-search"
				class="input input-bordered w-full min-w-0 flex-1"
				name="q"
				bind:value={q}
				placeholder="Cari judul, isi, atau URL…"
				autocomplete="off"
				enterkeyhint="search"
			/>
			<div class="flex w-full gap-2 sm:w-auto">
				<button class="btn btn-primary flex-1 sm:flex-none" type="submit">Cari</button>
				{#if data.filters.q}
					<a
						class="btn btn-ghost flex-1 sm:flex-none"
						href="/?{data.filters.type ? `type=${data.filters.type}` : ''}"
					>
						Reset
					</a>
				{/if}
			</div>
		</form>

		{#if data.filters.tag}
			<div class="text-sm opacity-70">
				Filter tag: <span class="badge badge-neutral">#{data.filters.tag}</span>
				<a class="link ml-2" href="/">bersihkan</a>
			</div>
		{/if}

		{#each shownSections as section (section.key)}
			<div>
				<header class="mb-2 flex items-center justify-between px-1">
					<h3 class="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider">
						<span class="cat-dot {section.dot}" aria-hidden="true"></span>
						<span>{section.label}</span>
						<span class="badge {section.badge} badge-sm">{section.rows.length}</span>
					</h3>
					<a class="link link-hover text-xs opacity-60" href="/?type={section.key}">
						Filter →
					</a>
				</header>
				<ItemTable
					items={section.rows}
					onRowClick={selectItem}
					emptyText="Belum ada {section.label.toLowerCase()}."
				/>
			</div>
		{/each}
	</section>
</div>

<ItemDetailModal item={selected} onClose={closeModal} />

<a
	href="#capture-form"
	class="btn btn-primary btn-circle btn-lg fixed bottom-5 right-5 z-40 shadow-lg lg:hidden"
	aria-label="Tambah baru"
	title="Tambah baru"
	style="padding-bottom: env(safe-area-inset-bottom);"
>
	<span class="text-2xl leading-none">+</span>
</a>
