<script lang="ts">
	import { page } from '$app/state';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import type { NavSection } from '$lib/nav';

	let { sections }: { sections: NavSection[] } = $props();

	const sidebar = Sidebar.useSidebar();

	function onNavigate() {
		// Close the mobile sheet after picking a destination.
		if (sidebar.isMobile) sidebar.setOpenMobile(false);
	}
</script>

{#each sections as section (section.title)}
	<Sidebar.Group>
		<Sidebar.GroupLabel>{section.title}</Sidebar.GroupLabel>
		<Sidebar.GroupContent>
			<Sidebar.Menu>
				{#each section.links as link (link.href)}
					{@const active = link.match(page.url)}
					<Sidebar.MenuItem>
						<Sidebar.MenuButton isActive={active} tooltipContent={link.label}>
							{#snippet child({ props })}
								<a
									href={link.href}
									aria-current={active ? 'page' : undefined}
									data-sveltekit-reload={link.href === '/export' ? true : undefined}
									onclick={onNavigate}
									{...props}
								>
									<link.icon />
									<span>{link.label}</span>
									{#if link.dot}
										<span class="cat-dot ms-auto {link.dot}" aria-hidden="true"></span>
									{/if}
								</a>
							{/snippet}
						</Sidebar.MenuButton>
					</Sidebar.MenuItem>
				{/each}
			</Sidebar.Menu>
		</Sidebar.GroupContent>
	</Sidebar.Group>
{/each}
