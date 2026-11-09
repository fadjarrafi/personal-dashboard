<script lang="ts">
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import { navSections } from '$lib/nav';
	import NavMain from './nav-main.svelte';
	import NavUser from './nav-user.svelte';
	import type { ComponentProps } from 'svelte';

	let { email, ...restProps }: { email: string } & ComponentProps<typeof Sidebar.Root> = $props();
</script>

<Sidebar.Root collapsible="icon" {...restProps}>
	<Sidebar.Header>
		<Sidebar.Menu>
			<Sidebar.MenuItem>
				<Sidebar.MenuButton class="data-[slot=sidebar-menu-button]:!p-1.5">
					{#snippet child({ props })}
						<a href="/" {...props}>
							<span class="text-primary flex size-5 items-center justify-center" aria-hidden="true"
								>◆</span
							>
							<span class="text-base font-semibold tracking-tight">Dashboard</span>
						</a>
					{/snippet}
				</Sidebar.MenuButton>
			</Sidebar.MenuItem>
		</Sidebar.Menu>
	</Sidebar.Header>
	<Sidebar.Content>
		<NavMain sections={navSections} />
	</Sidebar.Content>
	<Sidebar.Footer>
		<NavUser {email} />
	</Sidebar.Footer>
	<Sidebar.Rail />
</Sidebar.Root>
