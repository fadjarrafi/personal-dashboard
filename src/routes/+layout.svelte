<script lang="ts">
	import '../app.css';
	import 'highlight.js/styles/github-dark.css';
	import { page } from '$app/state';
	import Toast from '$lib/components/Toast.svelte';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: any } = $props();

	const navItems = [
		{ href: '/', label: 'Semua', match: (t: string | null) => t === null },
		{ href: '/?type=bookmark', label: 'Bookmark', match: (t: string | null) => t === 'bookmark' },
		{ href: '/?type=note', label: 'Note', match: (t: string | null) => t === 'note' },
		{ href: '/?type=snippet', label: 'Snippet', match: (t: string | null) => t === 'snippet' }
	];

	const activeType = $derived(page.url.searchParams.get('type'));
</script>

<Toast flash={data.flash} />

<div class="mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-4">
	{#if data.user}
		<header
			class="navbar mb-6 rounded-box border border-base-300 bg-base-200/60 px-3 backdrop-blur"
		>
			<div class="flex-1">
				<a href="/" class="btn btn-ghost text-lg font-semibold normal-case">
					<span class="text-primary">◆</span> Dashboard
				</a>
			</div>
			<nav class="flex-none gap-1 text-sm">
				{#each navItems as item}
					<a
						class="btn btn-sm {item.match(activeType) ? 'btn-primary' : 'btn-ghost'}"
						href={item.href}
					>
						{item.label}
					</a>
				{/each}
				<a
					class="btn btn-sm {page.url.pathname === '/archive' ? 'btn-primary' : 'btn-ghost'}"
					href="/archive"
					title="Arsip"
				>
					🗄
				</a>
				<div class="divider divider-horizontal mx-1"></div>
				<span class="hidden text-xs opacity-60 md:inline">{data.user.email}</span>
				<form method="post" action="/logout">
					<button class="btn btn-ghost btn-sm" type="submit" title="Keluar">↩</button>
				</form>
			</nav>
		</header>
	{/if}

	<main class="flex-1">
		{@render children()}
	</main>

	<footer class="mt-8 pt-4 text-center text-xs opacity-50">
		Personal Dashboard · v0.1
	</footer>
</div>
