<script lang="ts">
	import type { PageData } from './$types';
	import ConfirmAction from '$lib/components/ConfirmAction.svelte';
	import * as Table from '$lib/components/ui/table/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
	import Trash2 from '@lucide/svelte/icons/trash-2';

	let { data }: { data: PageData } = $props();

	function preview(body: string | null, url: string | null): string {
		const src = body ?? url ?? '';
		return src.length > 100 ? src.slice(0, 100) + '…' : src;
	}
</script>

{#snippet actions(id: number, compact: boolean)}
	<form method="post" action="?/unarchive">
		<input type="hidden" name="id" value={id} />
		<Button
			variant="ghost"
			size="sm"
			class={compact ? '' : 'tap-target'}
			type="submit"
			title="Restore"
		>
			<RotateCcw />Restore
		</Button>
	</form>
	<ConfirmAction
		action="?/delete"
		fields={{ id }}
		title="Delete permanently?"
		description="This item is removed for good. It cannot be undone."
		confirmLabel="Delete"
		destructive
		size="sm"
		class={compact ? '' : 'tap-target'}
		ariaLabel="Delete permanently"
	>
		<Trash2 />Delete
	</ConfirmAction>
{/snippet}

<div class="mb-4 px-1">
	<p class="text-muted-foreground text-sm">
		{data.items.length} archived item(s). Permanent deletion is only possible from here.
	</p>
</div>

{#if data.items.length === 0}
	<p class="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
		Archive is empty.
	</p>
{:else}
	<!-- Mobile: kartu -->
	<ul class="space-y-2 md:hidden" role="list">
		{#each data.items as item (item.id)}
			<li class="bg-card rounded-lg border p-3">
				<div class="mb-1 flex items-center justify-between gap-2">
					<Badge variant="secondary" class="capitalize">{item.type}</Badge>
					<time class="text-muted-foreground text-[11px]">
						{(item.archivedAt ?? '').slice(0, 10)}
					</time>
				</div>
				{#if item.title}
					<div class="truncate text-sm font-medium">{item.title}</div>
				{:else if item.url}
					<div class="text-primary truncate text-sm">{item.url}</div>
				{/if}
				{#if item.body}
					<div class="text-muted-foreground mt-1 line-clamp-2 text-xs">
						{preview(item.body, item.url)}
					</div>
				{/if}
				<div class="mt-2 flex flex-wrap justify-end gap-1">
					{@render actions(item.id, false)}
				</div>
			</li>
		{/each}
	</ul>

	<!-- Desktop: tabel -->
	<div class="bg-card hidden overflow-hidden rounded-lg border md:block">
		<Table.Root>
			<Table.Header>
				<Table.Row>
					<Table.Head class="w-24">Type</Table.Head>
					<Table.Head>Title / Content</Table.Head>
					<Table.Head class="w-40">Archived</Table.Head>
					<Table.Head class="w-56 text-right">Actions</Table.Head>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#each data.items as item (item.id)}
					<Table.Row>
						<Table.Cell>
							<Badge variant="secondary" class="capitalize">{item.type}</Badge>
						</Table.Cell>
						<Table.Cell class="max-w-0">
							{#if item.title}
								<div class="truncate font-medium">{item.title}</div>
							{:else if item.url}
								<div class="text-primary truncate">{item.url}</div>
							{/if}
							{#if item.body}
								<div class="text-muted-foreground truncate text-xs">
									{preview(item.body, item.url)}
								</div>
							{/if}
						</Table.Cell>
						<Table.Cell class="text-muted-foreground text-xs whitespace-nowrap">
							{(item.archivedAt ?? '').slice(0, 16).replace('T', ' ')}
						</Table.Cell>
						<Table.Cell>
							<div class="flex justify-end gap-1">
								{@render actions(item.id, true)}
							</div>
						</Table.Cell>
					</Table.Row>
				{/each}
			</Table.Body>
		</Table.Root>
	</div>
{/if}
