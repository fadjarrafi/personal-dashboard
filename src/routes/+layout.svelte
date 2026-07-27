<script lang="ts">
	import '../app.css';
	import 'highlight.js/styles/github-dark.css';
	import { page } from '$app/state';
	import Toast from '$lib/components/Toast.svelte';
	import Shortcuts from '$lib/components/Shortcuts.svelte';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: any } = $props();

	const navItems = [
		{ href: '/', label: 'Semua', icon: '◈', match: (t: string | null) => t === null },
		{ href: '/?type=bookmark', label: 'Bookmark', icon: '🔖', match: (t: string | null) => t === 'bookmark' },
		{ href: '/?type=note', label: 'Note', icon: '📝', match: (t: string | null) => t === 'note' },
		{ href: '/?type=snippet', label: 'Snippet', icon: '⌨', match: (t: string | null) => t === 'snippet' }
	];

	const activeType = $derived(page.url.searchParams.get('type'));
	const isArchive = $derived(page.url.pathname === '/archive');

	let drawerOpen = $state(false);

	function closeDrawer() {
		drawerOpen = false;
	}

	// Tutup drawer setiap kali route berubah.
	$effect(() => {
		void page.url.href;
		drawerOpen = false;
	});

	function onDrawerKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') drawerOpen = false;
	}
</script>

<svelte:window onkeydown={onDrawerKeydown} />

<Toast flash={data.flash} />
{#if data.user}<Shortcuts />{/if}

<a href="#main" class="skip-link">Lompat ke konten</a>

<div class="mx-auto flex min-h-screen max-w-7xl flex-col px-3 py-3 sm:px-4 sm:py-4">
	{#if data.user}
		<header
			class="mb-4 rounded-box border border-base-300 bg-base-200/60 p-2 backdrop-blur sm:mb-6 sm:p-3"
		>
			<div class="flex items-center justify-between gap-2">
				<div class="flex min-w-0 items-center gap-1">
					<button
						type="button"
						class="btn btn-ghost btn-sm tap-target lg:hidden"
						aria-label="Buka menu"
						aria-expanded={drawerOpen}
						aria-controls="mobile-drawer"
						onclick={() => (drawerOpen = true)}
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="h-5 w-5"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
							aria-hidden="true"
						>
							<line x1="4" y1="6" x2="20" y2="6" />
							<line x1="4" y1="12" x2="20" y2="12" />
							<line x1="4" y1="18" x2="20" y2="18" />
						</svg>
					</button>
					<a
						href="/"
						class="btn btn-ghost btn-sm gap-1 text-base font-semibold normal-case sm:text-lg"
					>
						<span class="text-primary">◆</span>
						<span>Dashboard</span>
					</a>
				</div>

				<!-- Nav inline: hanya di desktop -->
				<nav
					aria-label="Filter jenis"
					class="hidden flex-wrap items-center gap-1 text-sm lg:flex"
				>
					{#each navItems as item}
						{@const active = !isArchive && item.match(activeType)}
						<a
							class="btn btn-sm {active ? 'btn-primary' : 'btn-ghost'}"
							href={item.href}
							aria-current={active ? 'page' : undefined}
						>
							{item.label}
						</a>
					{/each}
					<a
						class="btn btn-sm {isArchive ? 'btn-primary' : 'btn-ghost'}"
						href="/archive"
						aria-current={isArchive ? 'page' : undefined}
					>
						🗄 Arsip
					</a>
				</nav>

				<div class="flex items-center gap-1">
					<span class="hidden text-xs opacity-60 md:inline" title={data.user.email}>
						{data.user.email}
					</span>
					<form method="post" action="/logout" class="hidden lg:block">
						<button
							class="btn btn-ghost btn-sm tap-target"
							type="submit"
							aria-label="Keluar"
							title="Keluar"
						>
							↩
						</button>
					</form>
				</div>
			</div>
		</header>
	{/if}

	<main id="main" class="flex-1">
		{@render children()}
	</main>

	<footer class="mt-8 pt-4 text-center text-xs opacity-50 safe-bottom">
		Personal Dashboard · v0.1
	</footer>
</div>

<!-- Drawer / sidebar untuk mobile -->
{#if data.user}
	<div
		class="fixed inset-0 z-50 lg:hidden {drawerOpen ? '' : 'pointer-events-none'}"
		aria-hidden={!drawerOpen}
	>
		<!-- Overlay -->
		<button
			type="button"
			class="absolute inset-0 bg-black/60 transition-opacity duration-200 {drawerOpen
				? 'opacity-100'
				: 'opacity-0'}"
			aria-label="Tutup menu"
			tabindex={drawerOpen ? 0 : -1}
			onclick={closeDrawer}
		></button>

		<!-- Panel -->
		<div
			id="mobile-drawer"
			class="absolute inset-y-0 left-0 flex w-72 max-w-[85%] flex-col border-r border-base-300 bg-base-200 shadow-2xl transition-transform duration-200 ease-out safe-top safe-bottom {drawerOpen
				? 'translate-x-0'
				: '-translate-x-full'}"
			role="dialog"
			aria-modal="true"
			aria-label="Menu navigasi"
		>
			<div class="flex items-center justify-between border-b border-base-300 px-4 py-3">
				<span class="text-base font-semibold">
					<span class="text-primary">◆</span> Dashboard
				</span>
				<button
					type="button"
					class="btn btn-ghost btn-sm btn-circle tap-target"
					aria-label="Tutup menu"
					onclick={closeDrawer}
				>
					✕
				</button>
			</div>

			<nav class="flex-1 overflow-y-auto p-3" aria-label="Menu utama">
				<div class="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider opacity-50">
					Filter jenis
				</div>
				<ul class="menu menu-lg w-full rounded-box p-0">
					{#each navItems as item}
						{@const active = !isArchive && item.match(activeType)}
						<li>
							<a
								href={item.href}
								class={active ? 'active' : ''}
								aria-current={active ? 'page' : undefined}
								onclick={closeDrawer}
							>
								<span aria-hidden="true" class="w-5 text-center">{item.icon}</span>
								<span>{item.label}</span>
							</a>
						</li>
					{/each}
				</ul>

				<div class="my-3 border-t border-base-300"></div>

				<ul class="menu menu-lg w-full rounded-box p-0">
					<li>
						<a
							href="/archive"
							class={isArchive ? 'active' : ''}
							aria-current={isArchive ? 'page' : undefined}
							onclick={closeDrawer}
						>
							<span aria-hidden="true" class="w-5 text-center">🗄</span>
							<span>Arsip</span>
						</a>
					</li>
					<li>
						<a href="/export" onclick={closeDrawer}>
							<span aria-hidden="true" class="w-5 text-center">⬇</span>
							<span>Export JSON</span>
						</a>
					</li>
				</ul>
			</nav>

			<div class="border-t border-base-300 p-3">
				<div class="mb-2 truncate px-2 text-xs opacity-60" title={data.user.email}>
					{data.user.email}
				</div>
				<form method="post" action="/logout">
					<button class="btn btn-ghost btn-block justify-start gap-2" type="submit">
						<span aria-hidden="true">↩</span> Keluar
					</button>
				</form>
			</div>
		</div>
	</div>
{/if}
