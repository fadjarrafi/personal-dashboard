<script lang="ts">
	import '../app.css';
	import { untrack } from 'svelte';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import AppSidebar from '$lib/components/app-sidebar.svelte';
	import SiteHeader from '$lib/components/site-header.svelte';
	import Toast from '$lib/components/Toast.svelte';
	import Shortcuts from '$lib/components/Shortcuts.svelte';
	import CommandPalette from '$lib/components/CommandPalette.svelte';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: any } = $props();

	let palette = $state<CommandPalette>();
	// Hanya nilai awal dari cookie; setelah itu Sidebar.Provider mengelola state + cookie.
	let sidebarOpen = $state(untrack(() => data.sidebarOpen));
</script>

<Toast flash={data.flash} />

<a href="#main" class="skip-link">Skip to content</a>

{#if data.user}
	<Shortcuts />
	<CommandPalette bind:this={palette} />

	<!-- App shell — dashboard-01 block (docs/design.md §Blocks). -->
	<Sidebar.Provider
		bind:open={sidebarOpen}
		style="--sidebar-width: calc(var(--spacing) * 64); --header-height: calc(var(--spacing) * 12);"
	>
		<AppSidebar variant="inset" email={data.user.email} />
		<Sidebar.Inset class="min-w-0">
			<SiteHeader onSearch={() => palette?.open()} />
			<main
				id="main"
				class="@container/main flex flex-1 flex-col px-3 py-4 sm:px-4 lg:px-6 lg:py-6"
			>
				{@render children()}
			</main>
			<footer
				class="text-muted-foreground safe-bottom border-t px-4 py-3 text-center text-xs lg:px-6"
			>
				Personal Dashboard · v0.1
			</footer>
		</Sidebar.Inset>
	</Sidebar.Provider>
{:else}
	<main id="main">
		{@render children()}
	</main>
{/if}
