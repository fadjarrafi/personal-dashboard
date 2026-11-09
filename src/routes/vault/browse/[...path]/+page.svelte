<script lang="ts">
	import type { PageData } from './$types';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import Folder from '@lucide/svelte/icons/folder';
	import Search from '@lucide/svelte/icons/search';

	let { data }: { data: PageData } = $props();

	function encodePath(path: string): string {
		return path
			.split('/')
			.filter((s) => s.length > 0)
			.map(encodeURIComponent)
			.join('/');
	}

	function browseHref(path: string): string {
		const enc = encodePath(path);
		return enc ? `/vault/browse/${enc}` : '/vault/browse';
	}

	function noteHref(path: string): string {
		return `/vault/${encodePath(path)}`;
	}

	function formatDate(iso: string): string {
		return iso.slice(0, 16).replace('T', ' ');
	}

	let breadcrumbs = $derived.by(() => {
		const segments = data.path.split('/').filter((s) => s.length > 0);
		let acc = '';
		return segments.map((name) => {
			acc = acc ? `${acc}/${name}` : name;
			return { name, path: acc };
		});
	});
</script>

<svelte:head>
	<title
		>{data.mode === 'search' ? `Search "${data.query}"` : data.path || 'All notes'} · Vault</title
	>
</svelte:head>

{#snippet noteRow(
	note: { path: string; title: string; updatedAt: string; excerpt?: string | null },
	showPath: boolean
)}
	<li class="bg-card hover:border-ring/40 rounded-md border p-2 transition-colors">
		<a class="text-sm font-medium underline-offset-4 hover:underline" href={noteHref(note.path)}>
			{note.title}
		</a>
		{#if !showPath && note.excerpt}
			<p class="text-muted-foreground mt-1 truncate text-xs">{note.excerpt}</p>
		{/if}
		<div class="text-muted-foreground mt-1 flex flex-wrap items-center gap-2 text-xs">
			<time>{formatDate(note.updatedAt)}</time>
			{#if showPath}<code>{note.path}</code>{/if}
		</div>
	</li>
{/snippet}

<div class="mx-auto max-w-3xl space-y-4">
	<div class="flex items-center justify-between gap-2">
		<nav
			aria-label="Breadcrumb"
			class="text-muted-foreground flex flex-wrap items-center gap-1 text-sm"
		>
			<a class="hover:text-foreground" href="/vault/browse">Vault</a>
			{#each breadcrumbs as crumb (crumb.path)}
				<ChevronRight class="size-3.5" aria-hidden="true" />
				<a class="hover:text-foreground" href={browseHref(crumb.path)}>{crumb.name}</a>
			{/each}
		</nav>
		<Button variant="ghost" size="sm" href="/vault"><ArrowLeft />Dashboard</Button>
	</div>

	<form method="get" role="search" class="flex gap-2">
		<Input
			type="search"
			name="q"
			value={data.query}
			placeholder="Search notes by title/file name…"
			aria-label="Search notes"
			class="h-8 flex-1"
		/>
		<Button size="sm" type="submit"><Search />Search</Button>
		{#if data.query}
			<Button variant="ghost" size="sm" href={browseHref(data.path)}>Clear</Button>
		{/if}
	</form>

	{#if data.mode === 'search'}
		<h2 class="label-mono">Results for "{data.query}" ({data.notes.length})</h2>
		<ul class="space-y-2">
			{#each data.notes as note (note.path)}
				{@render noteRow(note, true)}
			{:else}
				<li class="text-muted-foreground text-sm">No matching notes.</li>
			{/each}
		</ul>
	{:else}
		{#if data.folders.length > 0}
			<h2 class="label-mono">Folders</h2>
			<ul class="grid gap-1 sm:grid-cols-2">
				{#each data.folders as folder (folder.path)}
					<li>
						<a
							class="hover:bg-accent flex items-center gap-2 rounded-md px-2 py-1.5 text-sm"
							href={browseHref(folder.path)}
						>
							<Folder class="text-muted-foreground size-4" aria-hidden="true" />
							{folder.name}
						</a>
					</li>
				{/each}
			</ul>
		{/if}

		<h2 class="label-mono">Notes ({data.notes.length})</h2>
		<ul class="space-y-2">
			{#each data.notes as note (note.path)}
				{@render noteRow(note, false)}
			{:else}
				<li class="text-muted-foreground text-sm">No notes in this folder.</li>
			{/each}
		</ul>

		{#if data.folders.length === 0 && data.notes.length === 0}
			<p class="text-muted-foreground text-sm">Empty folder.</p>
		{/if}
	{/if}
</div>
