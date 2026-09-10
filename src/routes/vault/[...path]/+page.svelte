<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>{data.note.title} · Vault</title>
</svelte:head>

<article class="mx-auto max-w-2xl">
	<a class="btn btn-ghost btn-sm mb-3" href="/vault">← Vault</a>

	<header class="mb-4">
		<h1 class="font-display text-2xl font-semibold">{data.note.title}</h1>
		<div class="mt-1 flex flex-wrap items-center gap-2 text-xs opacity-60">
			<time>{data.note.updatedAt.slice(0, 16).replace('T', ' ')}</time>
			<code>{data.note.path}</code>
		</div>
		{#if Array.isArray(data.note.frontmatter.tags) && data.note.frontmatter.tags.length > 0}
			<div class="mt-2 flex flex-wrap gap-1">
				{#each data.note.frontmatter.tags as tag}
					<span class="badge badge-outline badge-sm">#{tag}</span>
				{/each}
			</div>
		{/if}
	</header>

	<div
		class="space-y-3 text-sm leading-relaxed [&_a]:link [&_a]:link-primary [&_code]:font-mono [&_h1]:mt-4 [&_h1]:text-xl [&_h1]:font-semibold [&_h2]:mt-4 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:mt-3 [&_h3]:font-medium [&_li]:ml-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_pre]:mockup-code [&_pre]:overflow-auto [&_pre]:p-3 [&_pre]:text-xs [&_ul]:list-disc [&_ul]:pl-5"
	>
		{@html data.note.html}
	</div>
</article>
