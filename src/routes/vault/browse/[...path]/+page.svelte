<script lang="ts">
	import type { PageData } from './$types';

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
	<title>{data.mode === 'search' ? `Cari "${data.query}"` : data.path || 'Semua note'} · Vault</title>
</svelte:head>

<div class="mx-auto max-w-3xl">
	<div class="mb-3 flex items-center justify-between gap-2">
		<div class="flex flex-wrap items-center gap-1 text-sm">
			<a class="link link-hover" href="/vault/browse">Vault</a>
			{#each breadcrumbs as crumb (crumb.path)}
				<span class="opacity-40">/</span>
				<a class="link link-hover" href={browseHref(crumb.path)}>{crumb.name}</a>
			{/each}
		</div>
		<a class="btn btn-ghost btn-sm" href="/vault">← Dashboard</a>
	</div>

	<form method="get" class="mb-4 flex gap-2">
		<input
			type="search"
			name="q"
			value={data.query}
			placeholder="Cari note lewat judul/nama file..."
			class="input input-bordered input-sm flex-1"
		/>
		<button class="btn btn-primary btn-sm" type="submit">Cari</button>
		{#if data.query}
			<a class="btn btn-ghost btn-sm" href={browseHref(data.path)}>Bersihkan</a>
		{/if}
	</form>

	{#if data.mode === 'search'}
		<h2 class="mb-2 font-display text-sm font-semibold uppercase tracking-wide opacity-70">
			Hasil untuk "{data.query}" ({data.notes.length})
		</h2>
		<ul class="space-y-2">
			{#each data.notes as note (note.path)}
				<li class="rounded-lg bg-base-200 p-2">
					<a class="link link-hover text-sm font-medium" href={noteHref(note.path)}>{note.title}</a>
					<div class="mt-1 flex flex-wrap items-center gap-2 text-xs opacity-60">
						<time>{formatDate(note.updatedAt)}</time>
						<code>{note.path}</code>
					</div>
				</li>
			{:else}
				<li class="text-sm opacity-60">Tidak ada note yang cocok.</li>
			{/each}
		</ul>
	{:else}
		{#if data.folders.length > 0}
			<h2 class="mb-2 font-display text-sm font-semibold uppercase tracking-wide opacity-70">Folder</h2>
			<ul class="mb-4 grid gap-1 sm:grid-cols-2">
				{#each data.folders as folder (folder.path)}
					<li>
						<a class="link link-hover flex items-center gap-1 text-sm" href={browseHref(folder.path)}>
							📁 {folder.name}
						</a>
					</li>
				{/each}
			</ul>
		{/if}

		<h2 class="mb-2 font-display text-sm font-semibold uppercase tracking-wide opacity-70">
			Note ({data.notes.length})
		</h2>
		<ul class="space-y-2">
			{#each data.notes as note (note.path)}
				<li class="rounded-lg bg-base-200 p-2">
					<a class="link link-hover text-sm font-medium" href={noteHref(note.path)}>{note.title}</a>
					{#if note.excerpt}<p class="mt-1 truncate text-xs opacity-70">{note.excerpt}</p>{/if}
					<div class="mt-1 text-xs opacity-50">{formatDate(note.updatedAt)}</div>
				</li>
			{:else}
				<li class="text-sm opacity-60">Tidak ada note di folder ini.</li>
			{/each}
		</ul>

		{#if data.folders.length === 0 && data.notes.length === 0}
			<p class="text-sm opacity-60">Folder kosong.</p>
		{/if}
	{/if}
</div>
