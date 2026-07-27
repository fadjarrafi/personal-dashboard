<script lang="ts">
	import type { ActionData, PageData } from './$types';
	import CaptureForm from '$lib/components/CaptureForm.svelte';
	import ItemTable from '$lib/components/ItemTable.svelte';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// svelte-ignore state_referenced_locally
	let q = $state(data.filters.q ?? '');
</script>

<div class="grid gap-4 lg:grid-cols-[380px_1fr]">
	<aside class="space-y-2 lg:sticky lg:top-4 lg:self-start">
		<h2 class="px-1 text-xs font-semibold uppercase tracking-wider opacity-60">Tambah baru</h2>
		<CaptureForm tags={data.tags} />
		{#if form && 'error' in form && form.error}
			<div role="alert" class="alert alert-error py-2 text-sm">{form.error}</div>
		{/if}
	</aside>

	<section class="min-w-0 space-y-3">
		<form method="get" class="join w-full">
			{#if data.filters.type}<input type="hidden" name="type" value={data.filters.type} />{/if}
			{#if data.filters.tag}<input type="hidden" name="tag" value={data.filters.tag} />{/if}
			<input
				class="input input-bordered join-item flex-1"
				name="q"
				bind:value={q}
				placeholder="Cari judul, isi, atau URL…"
				autocomplete="off"
			/>
			<button class="btn btn-primary join-item" type="submit">Cari</button>
			{#if data.filters.q}
				<a
					class="btn btn-ghost join-item"
					href="/?{data.filters.type ? `type=${data.filters.type}` : ''}"
				>
					Reset
				</a>
			{/if}
		</form>

		<div class="flex flex-wrap items-center justify-between gap-2 text-sm">
			<div class="opacity-70">
				{data.items.length} item{data.items.length === 1 ? '' : 's'}
				{#if data.filters.type}<span class="opacity-60">· tipe: {data.filters.type}</span>{/if}
				{#if data.filters.tag}
					<span class="opacity-60">·</span>
					<span class="badge badge-neutral">#{data.filters.tag}</span>
					<a class="link ml-1" href="/">bersihkan</a>
				{/if}
			</div>
			<a class="link link-hover text-xs opacity-70" href="/export">Export JSON</a>
		</div>

		{#if data.items.length === 0}
			<div class="rounded-box border border-dashed border-base-300 p-8 text-center text-sm opacity-60">
				Belum ada item. Gunakan form di sebelah kiri untuk mulai menyimpan.
			</div>
		{:else}
			<ItemTable items={data.items} />
		{/if}
	</section>
</div>
