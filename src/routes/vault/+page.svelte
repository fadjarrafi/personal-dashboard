<script lang="ts">
	import type { PageData } from './$types';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import FolderOpen from '@lucide/svelte/icons/folder-open';
	import Plus from '@lucide/svelte/icons/plus';
	import Check from '@lucide/svelte/icons/check';

	let { data }: { data: PageData } = $props();

	function formatDate(iso: string): string {
		return iso.slice(0, 16).replace('T', ' ');
	}

	function vaultHref(path: string): string {
		return `/vault/${path.split('/').map(encodeURIComponent).join('/')}`;
	}
</script>

<svelte:head>
	<title>Vault · Dashboard</title>
</svelte:head>

{#snippet noteLink(path: string, title: string)}
	<a
		class="hover:text-primary text-sm font-medium underline-offset-4 hover:underline"
		href={vaultHref(path)}
	>
		{title}
	</a>
{/snippet}

<div class="space-y-4">
	<div class="flex flex-wrap justify-end gap-2 px-1">
		<Button variant="outline" size="sm" href="/vault/browse"><FolderOpen />Browse vault</Button>
		<Button size="sm" href="/vault/new"><Plus />New note</Button>
	</div>

	<div class="grid gap-4 sm:gap-6 lg:grid-cols-3">
		<Card.Root class="gap-3 py-4">
			<Card.Header class="px-4">
				<Card.Title class="label-mono">Tasks</Card.Title>
			</Card.Header>
			<Card.Content class="space-y-3 px-4">
				<ul class="space-y-0.5">
					{#each data.tasks as task (task.id)}
						<li class="flex items-center gap-1">
							<form method="post" action="?/toggleTask">
								<input type="hidden" name="id" value={task.id} />
								<button
									type="submit"
									class="tap-target flex items-center justify-center"
									aria-label={task.done ? 'Mark as not done' : 'Mark as done'}
								>
									<span
										class="flex size-5 items-center justify-center rounded-sm border transition-colors {task.done
											? 'border-primary bg-primary text-primary-foreground'
											: 'border-input hover:border-ring'}"
									>
										{#if task.done}<Check class="size-3.5" />{/if}
									</span>
								</button>
							</form>
							<span class="text-sm {task.done ? 'text-muted-foreground line-through' : ''}">
								{task.text}
							</span>
						</li>
					{:else}
						<li class="text-muted-foreground text-sm">No tasks yet.</li>
					{/each}
				</ul>

				<form method="post" action="?/addTask" class="flex gap-2">
					<Input
						type="text"
						name="text"
						placeholder="New task…"
						aria-label="New task"
						class="h-8 flex-1"
						required
					/>
					<Button size="sm" type="submit">Add</Button>
				</form>
				<p class="text-muted-foreground text-xs">
					Saved to <code class="text-foreground">Dashboard Sync/Tasks.md</code> - can also be edited directly
					in Obsidian.
				</p>
			</Card.Content>
		</Card.Root>

		<Card.Root class="gap-3 py-4">
			<Card.Header class="px-4">
				<Card.Title class="label-mono">Journal</Card.Title>
			</Card.Header>
			<Card.Content class="px-4">
				<ul class="space-y-2">
					{#each data.journal as note (note.path)}
						<li>
							{@render noteLink(note.path, note.title)}
							<div class="text-muted-foreground text-xs">{formatDate(note.updatedAt)}</div>
						</li>
					{:else}
						<li class="text-muted-foreground text-sm">No entries.</li>
					{/each}
				</ul>
			</Card.Content>
		</Card.Root>

		<Card.Root class="gap-3 py-4">
			<Card.Header class="px-4">
				<Card.Title class="label-mono">Roadmap</Card.Title>
			</Card.Header>
			<Card.Content class="px-4">
				<ul class="space-y-2">
					{#each data.roadmap as note (note.path)}
						<li class="flex flex-wrap items-center gap-2">
							{@render noteLink(note.path, note.title)}
							{#if note.frontmatter.status}
								<Badge variant="outline">{note.frontmatter.status}</Badge>
							{/if}
						</li>
					{:else}
						<li class="text-muted-foreground text-sm">No items.</li>
					{/each}
				</ul>
			</Card.Content>
		</Card.Root>

		<Card.Root class="gap-3 py-4 lg:col-span-3">
			<Card.Header class="px-4">
				<Card.Title class="label-mono">Captures from the dashboard</Card.Title>
			</Card.Header>
			<Card.Content class="px-4">
				<ul class="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
					{#each data.captures as note (note.path)}
						<li class="bg-well rounded-md border p-2">
							{@render noteLink(note.path, note.title)}
							{#if note.excerpt}
								<p class="text-muted-foreground mt-1 truncate text-xs">{note.excerpt}</p>
							{/if}
						</li>
					{:else}
						<li class="text-muted-foreground text-sm">No captures yet.</li>
					{/each}
				</ul>
			</Card.Content>
		</Card.Root>
	</div>
</div>
