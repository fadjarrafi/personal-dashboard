<script lang="ts">
	import Search from '@lucide/svelte/icons/search';
	import { page } from '$app/state';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import { navSections } from '$lib/nav';

	let { onSearch }: { onSearch: () => void } = $props();

	// Page title = the active nav link's label, falling back to the first path segment.
	const title = $derived.by(() => {
		for (const section of navSections) {
			const link = section.links.find((l) => l.match(page.url));
			if (link) return link.label;
		}
		const seg = page.url.pathname.split('/').filter(Boolean)[0] ?? 'Dashboard';
		return seg.charAt(0).toUpperCase() + seg.slice(1);
	});
</script>

<header
	class="bg-background/90 safe-top sticky top-0 z-10 flex h-(--header-height) shrink-0 items-center gap-2 rounded-t-[inherit] border-b backdrop-blur-none transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)"
>
	<div class="flex w-full items-center gap-1 px-3 lg:gap-2 lg:px-6">
		<Sidebar.Trigger class="tap-target -ms-1 lg:min-h-0 lg:min-w-0" />
		<Separator orientation="vertical" class="mx-2 data-[orientation=vertical]:h-4" />
		<h1 class="truncate text-base font-medium">{title}</h1>
		<div class="ms-auto flex items-center gap-2">
			<Button
				variant="outline"
				size="sm"
				class="tap-target text-muted-foreground gap-2 sm:min-w-56 sm:justify-between lg:min-h-0"
				aria-label="Search & commands (Ctrl+K)"
				onclick={onSearch}
			>
				<span class="flex items-center gap-2">
					<Search class="size-4" />
					<span class="hidden sm:inline">Search…</span>
				</span>
				<kbd
					class="bg-muted text-muted-foreground hidden rounded-sm border px-1.5 font-mono text-[10px] sm:inline"
				>
					Ctrl K
				</kbd>
			</Button>
		</div>
	</div>
</header>
