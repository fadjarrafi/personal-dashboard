<script lang="ts">
	import type { PageData } from './$types';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import { mermaidBlocks } from '$lib/mermaid';

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

	let breadcrumbs = $derived.by(() => {
		const segments = data.note.path.split('/').filter((s) => s.length > 0);
		const folders = segments.slice(0, -1);
		let acc = '';
		return folders.map((name) => {
			acc = acc ? `${acc}/${name}` : name;
			return { name, path: acc };
		});
	});
</script>

<svelte:head>
	<title>{data.note.title} · Vault</title>
</svelte:head>

<article class="mx-auto max-w-2xl">
	<nav
		aria-label="Breadcrumb"
		class="text-muted-foreground mb-3 flex flex-wrap items-center gap-1 text-sm"
	>
		<a class="hover:text-foreground" href="/vault/browse">Vault</a>
		{#each breadcrumbs as crumb (crumb.path)}
			<ChevronRight class="size-3.5" aria-hidden="true" />
			<a class="hover:text-foreground" href={browseHref(crumb.path)}>{crumb.name}</a>
		{/each}
	</nav>

	<header class="mb-4">
		<h1 class="text-2xl font-semibold">{data.note.title}</h1>
		<div class="text-muted-foreground mt-1 flex flex-wrap items-center gap-2 text-xs">
			<time>{data.note.updatedAt.slice(0, 16).replace('T', ' ')}</time>
			<code>{data.note.path}</code>
		</div>
		{#if Array.isArray(data.note.frontmatter.tags) && data.note.frontmatter.tags.length > 0}
			<div class="mt-2 flex flex-wrap gap-1">
				{#each data.note.frontmatter.tags as tag (tag)}
					<Badge variant="outline">#{tag}</Badge>
				{/each}
			</div>
		{/if}
	</header>

	<div
		class="[&_a]:text-primary [&_pre]:bg-well space-y-3 text-sm leading-relaxed [&_a]:underline-offset-4 [&_a:hover]:underline [&_code]:font-mono [&_h1]:mt-4 [&_h1]:text-xl [&_h1]:font-semibold [&_h2]:mt-4 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:mt-3 [&_h3]:font-medium [&_li]:ml-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_pre]:overflow-auto [&_pre]:rounded-md [&_pre]:border [&_pre]:p-3 [&_pre]:text-xs [&_ul]:list-disc [&_ul]:pl-5"
		use:mermaidBlocks={data.note.html}
	>
		{@html data.note.html}
	</div>
</article>
