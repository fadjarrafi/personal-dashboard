<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';
	import { untrack } from 'svelte';
	import Toast from '$lib/components/Toast.svelte';
	import Shortcuts from '$lib/components/Shortcuts.svelte';
	import CommandPalette from '$lib/components/CommandPalette.svelte';
	import { navSections } from '$lib/nav';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: any } = $props();

	let palette = $state<CommandPalette>();
	let drawerOpen = $state(false);
	// Hanya nilai awal dari cookie; setelah itu state dikelola di klien.
	let sidebarCollapsed = $state(untrack(() => data.sidebarCollapsed));

	function toggleSidebar() {
		sidebarCollapsed = !sidebarCollapsed;
		document.cookie = `sidebar=${sidebarCollapsed ? 'collapsed' : 'expanded'}; path=/; max-age=31536000; samesite=lax`;
	}

	function closeDrawer() {
		drawerOpen = false;
	}
	function noop() {}

	// Tutup drawer setiap kali route berubah.
	$effect(() => {
		void page.url.href;
		drawerOpen = false;
	});

	function onDrawerKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') drawerOpen = false;
	}
</script>

{#snippet navLink(
	href: string,
	label: string,
	active: boolean,
	icon: string,
	dot: string | null,
	compact: boolean,
	onItemClick: () => void
)}
	<li>
		<a
			{href}
			class="{active ? 'active' : ''} {compact ? 'justify-center px-0' : ''}"
			aria-current={active ? 'page' : undefined}
			aria-label={compact ? label : undefined}
			title={compact ? label : undefined}
			onclick={onItemClick}
		>
			{#if dot}
				<span class="flex w-5 justify-center" aria-hidden="true">
					<span class="cat-dot {dot}"></span>
				</span>
			{:else}
				<span class="w-5 text-center opacity-60" aria-hidden="true">{icon}</span>
			{/if}
			{#if !compact}<span>{label}</span>{/if}
		</a>
	</li>
{/snippet}

{#snippet navGroups(onItemClick: () => void, compact = false)}
	{#each navSections as section, i}
		{#if i > 0}<div class="my-3 border-t border-base-300"></div>{/if}
		{#if !compact}
			<div class="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider opacity-50">
				{section.title}
			</div>
		{/if}
		<ul class="menu menu-lg w-full rounded-box p-0">
			{#each section.links as link}
				{@render navLink(
					link.href,
					link.label,
					link.match(page.url),
					link.icon ?? '◈',
					link.dot ?? null,
					compact,
					onItemClick
				)}
			{/each}
		</ul>
	{/each}
{/snippet}

<svelte:window onkeydown={onDrawerKeydown} />

<Toast flash={data.flash} />
{#if data.user}<Shortcuts /><CommandPalette bind:this={palette} />{/if}

<a href="#main" class="skip-link">Skip to content</a>

<div class="flex min-h-screen">
	{#if data.user}
		<!-- Sidebar: persisten di desktop (>= lg), digantikan drawer di mobile. -->
		<aside
			class="sticky top-0 hidden h-screen shrink-0 flex-col border-r border-base-300 bg-base-200 transition-[width] duration-200 lg:flex {sidebarCollapsed
				? 'w-16'
				: 'w-64'}"
		>
			<div
				class="flex items-center border-b border-base-300 {sidebarCollapsed
					? 'flex-col gap-2 px-2 py-3'
					: 'justify-between gap-2 px-4 py-4'}"
			>
				<div class="min-w-0">
					<a
						href="/"
						class="flex items-center gap-2 font-display text-lg font-semibold"
						aria-label={sidebarCollapsed ? 'Dashboard' : undefined}
						title={sidebarCollapsed ? 'Dashboard' : undefined}
					>
						<span class="text-primary">◆</span>
						{#if !sidebarCollapsed}<span>Dashboard</span>{/if}
					</a>
					{#if !sidebarCollapsed}<div class="label-mono mt-1">Single user</div>{/if}
				</div>
				<button
					type="button"
					class="btn btn-ghost btn-sm btn-square tap-target"
					aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
					aria-expanded={!sidebarCollapsed}
					title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
					onclick={toggleSidebar}
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-5 w-5 transition-transform duration-200 {sidebarCollapsed ? 'rotate-180' : ''}"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						aria-hidden="true"
					>
						<polyline points="11 17 6 12 11 7" />
						<polyline points="18 17 13 12 18 7" />
					</svg>
				</button>
			</div>
			<nav
				class="flex-1 overflow-y-auto {sidebarCollapsed ? 'px-2 py-3' : 'p-3'}"
				aria-label="Main navigation"
			>
				<button
					type="button"
					class="btn btn-ghost btn-sm mb-3 w-full border border-base-300 font-normal {sidebarCollapsed
						? 'justify-center px-0'
						: 'justify-between'}"
					aria-label="Search & commands (Ctrl+K)"
					title={sidebarCollapsed ? 'Search (Ctrl+K)' : undefined}
					onclick={() => palette?.open()}
				>
					{#if sidebarCollapsed}
						<span aria-hidden="true">⌕</span>
					{:else}
						<span class="opacity-60">Search…</span>
						<kbd class="kbd kbd-xs">Ctrl K</kbd>
					{/if}
				</button>
				{@render navGroups(noop, sidebarCollapsed)}
			</nav>
			<div class="border-t border-base-300 {sidebarCollapsed ? 'px-2 py-3' : 'p-3'}">
				{#if !sidebarCollapsed}
					<div class="mb-2 truncate px-2 text-xs opacity-60" title={data.user.email}>
						{data.user.email}
					</div>
				{/if}
				<form method="post" action="/logout">
					<button
						class="btn btn-ghost btn-block gap-2 {sidebarCollapsed ? 'justify-center px-0' : 'justify-start'}"
						type="submit"
						aria-label={sidebarCollapsed ? 'Log out' : undefined}
						title={sidebarCollapsed ? `Log out (${data.user.email})` : undefined}
					>
						<span aria-hidden="true">↩</span>
						{#if !sidebarCollapsed}Log out{/if}
					</button>
				</form>
			</div>
		</aside>
	{/if}

	<div class="flex w-full min-w-0 flex-1 flex-col px-3 py-3 sm:px-4 sm:py-4 lg:px-6 lg:py-6">
		{#if data.user}
			<header class="mb-4 border-b border-base-300 pb-2 sm:mb-6 sm:pb-3 lg:hidden">
				<div class="flex items-center gap-1">
					<button
						type="button"
						class="btn btn-ghost btn-sm tap-target"
						aria-label="Open menu"
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
						class="btn btn-ghost btn-sm gap-1.5 font-display text-base font-semibold normal-case sm:text-lg"
					>
						<span class="text-primary">◆</span>
						<span>Dashboard</span>
					</a>
					<button
						type="button"
						class="btn btn-ghost btn-sm tap-target ml-auto"
						aria-label="Search & commands (Ctrl+K)"
						onclick={() => palette?.open()}
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
							<circle cx="11" cy="11" r="7" />
							<line x1="21" y1="21" x2="16.65" y2="16.65" />
						</svg>
					</button>
				</div>
			</header>
		{/if}

		<main id="main" class="flex-1">
			{@render children()}
		</main>

		<footer
			class="mt-8 border-t border-base-300 pt-3 text-center font-mono text-xs opacity-50 safe-bottom"
		>
			Personal Dashboard · v0.1
		</footer>
	</div>
</div>

<!-- Drawer navigasi untuk mobile (< lg) -->
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
			aria-label="Close menu"
			tabindex={drawerOpen ? 0 : -1}
			onclick={closeDrawer}
		></button>

		<!-- Panel -->
		<div
			id="mobile-drawer"
			class="absolute inset-y-0 left-0 flex w-72 max-w-[85%] flex-col border-r border-base-300 bg-base-200 transition-transform duration-200 ease-out safe-top safe-bottom {drawerOpen
				? 'translate-x-0'
				: '-translate-x-full'}"
			role="dialog"
			aria-modal="true"
			aria-label="Navigation menu"
		>
			<div class="flex items-center justify-between border-b border-base-300 px-4 py-3">
				<span class="font-display text-base font-semibold">
					<span class="text-primary">◆</span> Dashboard
				</span>
				<button
					type="button"
					class="btn btn-ghost btn-sm btn-square tap-target"
					aria-label="Close menu"
					onclick={closeDrawer}
				>
					✕
				</button>
			</div>

			<nav class="flex-1 overflow-y-auto p-3" aria-label="Main menu">
				{@render navGroups(closeDrawer)}
			</nav>

			<div class="border-t border-base-300 p-3">
				<div class="mb-2 truncate px-2 text-xs opacity-60" title={data.user.email}>
					{data.user.email}
				</div>
				<form method="post" action="/logout">
					<button class="btn btn-ghost btn-block justify-start gap-2" type="submit">
						<span aria-hidden="true">↩</span> Log out
					</button>
				</form>
			</div>
		</div>
	</div>
{/if}
