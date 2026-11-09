<script lang="ts">
	import EllipsisVertical from '@lucide/svelte/icons/ellipsis-vertical';
	import LogOut from '@lucide/svelte/icons/log-out';
	import * as Avatar from '$lib/components/ui/avatar/index.js';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';

	let { email }: { email: string } = $props();

	const sidebar = Sidebar.useSidebar();
	const initials = $derived(email.slice(0, 2).toUpperCase());

	let logoutForm = $state<HTMLFormElement>();
</script>

<!-- Logout must stay a POST (CSRF-checked in hooks.server.ts), so the menu item
     submits this hidden form instead of navigating. -->
<form method="post" action="/logout" bind:this={logoutForm} class="hidden"></form>

<Sidebar.Menu>
	<Sidebar.MenuItem>
		<DropdownMenu.Root>
			<DropdownMenu.Trigger>
				{#snippet child({ props })}
					<Sidebar.MenuButton
						{...props}
						size="lg"
						class="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
					>
						<Avatar.Root class="size-8 rounded-md">
							<Avatar.Fallback class="bg-secondary rounded-md text-xs">{initials}</Avatar.Fallback>
						</Avatar.Root>
						<div class="grid flex-1 text-start text-sm leading-tight">
							<span class="truncate font-medium">Single user</span>
							<span class="text-muted-foreground truncate text-xs">{email}</span>
						</div>
						<EllipsisVertical class="ms-auto size-4" />
					</Sidebar.MenuButton>
				{/snippet}
			</DropdownMenu.Trigger>
			<DropdownMenu.Content
				class="w-(--bits-dropdown-menu-anchor-width) min-w-56 rounded-lg"
				side={sidebar.isMobile ? 'bottom' : 'right'}
				align="end"
				sideOffset={4}
			>
				<DropdownMenu.Label class="text-muted-foreground truncate text-xs font-normal">
					{email}
				</DropdownMenu.Label>
				<DropdownMenu.Separator />
				<DropdownMenu.Item onSelect={() => logoutForm?.requestSubmit()}>
					<LogOut />
					Log out
				</DropdownMenu.Item>
			</DropdownMenu.Content>
		</DropdownMenu.Root>
	</Sidebar.MenuItem>
</Sidebar.Menu>
