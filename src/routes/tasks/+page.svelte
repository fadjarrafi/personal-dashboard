<script lang="ts">
	import type { ActionData, PageData } from './$types';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Checkbox } from '$lib/components/ui/checkbox/index.js';
	import { Badge, type BadgeVariant } from '$lib/components/ui/badge/index.js';
	import { NativeSelect } from '$lib/components/ui/native-select/index.js';
	import { AnimatedGroup } from '$lib/components/motion';
	import Check from '@lucide/svelte/icons/check';
	import Pin from '@lucide/svelte/icons/pin';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const priorityLabels: Record<string, string> = {
		low: 'Low',
		normal: 'Normal',
		high: 'High'
	};
	const priorityBadge: Record<string, BadgeVariant> = {
		low: 'secondary',
		normal: 'secondary',
		high: 'destructive'
	};
	const statusLabels: Record<string, string> = {
		done: 'Done',
		overdue: 'Overdue',
		due_soon: 'Due soon',
		upcoming: 'Upcoming',
		no_due_date: 'No due date'
	};
	const statusBadge: Record<string, { variant: BadgeVariant; class?: string }> = {
		done: { variant: 'outline', class: 'border-success/40 text-success' },
		overdue: { variant: 'destructive' },
		due_soon: { variant: 'outline', class: 'border-warning/40 text-warning' },
		upcoming: { variant: 'secondary' },
		no_due_date: { variant: 'secondary' }
	};

	function shortDate(iso: string): string {
		return new Date(iso).toLocaleDateString('en-GB', {
			day: '2-digit',
			month: 'short',
			year: 'numeric'
		});
	}

	function dueLabel(days: number): string {
		if (days < 0) return `${Math.abs(days)} day(s) overdue`;
		if (days === 0) return 'Due today';
		return `In ${days} day(s)`;
	}
</script>

<div class="grid gap-4 sm:gap-6 lg:grid-cols-[380px_1fr]">
	<aside
		class="order-2 space-y-3 lg:sticky lg:top-[calc(var(--header-height)+1rem)] lg:order-1 lg:self-start"
	>
		<section aria-labelledby="task-add-heading" class="space-y-2">
			<h2 id="task-add-heading" class="label-mono px-1">Add task</h2>
			<form method="post" action="?/create" class="bg-card space-y-3 rounded-lg border p-3 sm:p-4">
				<div class="grid gap-1.5">
					<Label for="task-title">Title</Label>
					<Input
						id="task-title"
						name="title"
						placeholder="What needs to be done?"
						required
						autocomplete="off"
					/>
				</div>

				<div class="grid gap-1.5">
					<Label for="task-notes">Notes</Label>
					<Textarea id="task-notes" name="notes" rows={2} />
				</div>

				<div class="grid gap-1.5">
					<Label for="task-due">Due date (optional)</Label>
					<Input id="task-due" name="due_at" type="date" />
				</div>

				<div class="grid gap-1.5">
					<Label for="task-priority">Priority</Label>
					<NativeSelect id="task-priority" class="w-full" name="priority" value="normal">
						{#each data.priorities as p (p)}
							<option value={p}>{priorityLabels[p]}</option>
						{/each}
					</NativeSelect>
				</div>

				<div class="grid gap-1.5">
					<Label for="task-tags">Tags (comma-separated)</Label>
					<Input id="task-tags" name="tags" list="known-tags" autocomplete="off" />
					<datalist id="known-tags">
						{#each data.tags as t (t)}
							<option value={t}></option>
						{/each}
					</datalist>
				</div>

				<div class="flex items-center gap-2">
					<Checkbox id="task-pinned" name="pinned" />
					<Label for="task-pinned" class="font-normal">Pin to top</Label>
				</div>

				<Button class="w-full" type="submit">Save</Button>

				{#if form && 'error' in form && form.error}
					<p role="alert" class="text-destructive text-sm">{form.error}</p>
				{/if}
			</form>
		</section>
	</aside>

	<section class="order-1 min-w-0 space-y-3 lg:order-2">
		<header class="flex flex-wrap items-center justify-end gap-2 px-1">
			<Button
				variant={data.includeDone ? 'secondary' : 'ghost'}
				size="sm"
				aria-pressed={data.includeDone}
				href="?{new URLSearchParams({
					...(data.tag ? { tag: data.tag } : {}),
					...(data.includeDone ? {} : { done: '1' })
				}).toString()}"
			>
				{#if data.includeDone}<Check />{/if}Show completed
			</Button>
			{#if data.tags.length > 0}
				<form method="get" class="inline-flex items-center gap-1">
					{#if data.includeDone}<input type="hidden" name="done" value="1" />{/if}
					<NativeSelect
						size="sm"
						name="tag"
						aria-label="Filter by tag"
						value={data.tag ?? ''}
						onchange={(e) => (e.currentTarget as HTMLSelectElement).form?.submit()}
					>
						<option value="">All tags</option>
						{#each data.tags as t (t)}
							<option value={t}>{t}</option>
						{/each}
					</NativeSelect>
				</form>
			{/if}
		</header>

		{#if data.tasks.length === 0}
			<p class="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
				No tasks recorded yet.
			</p>
		{:else}
			<AnimatedGroup class="space-y-2">
				{#each data.tasks as t (t.id)}
					<div class="bg-card rounded-lg border px-3 py-1">
						<div class="flex items-start justify-between gap-2">
							<form method="post" action="?/toggleDone">
								<input type="hidden" name="id" value={t.id} />
								<button
									type="submit"
									class="tap-target flex items-center justify-center"
									aria-label={t.doneAt ? 'Mark as not done' : 'Mark as done'}
								>
									<span
										class="flex size-5 items-center justify-center rounded-sm border transition-colors {t.doneAt
											? 'border-primary bg-primary text-primary-foreground'
											: 'border-input hover:border-ring'}"
									>
										{#if t.doneAt}<Check class="size-3.5" />{/if}
									</span>
								</button>
							</form>
							<a href="/tasks/{t.id}" class="min-w-0 flex-1 py-2.5">
								<div
									class="truncate text-sm font-medium {t.doneAt
										? 'text-muted-foreground line-through'
										: ''}"
								>
									{t.title}
								</div>
								<div
									class="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs"
								>
									<Badge variant={priorityBadge[t.priority]}>{priorityLabels[t.priority]}</Badge>
									<Badge
										variant={statusBadge[t.status].variant}
										class={statusBadge[t.status].class}
									>
										{statusLabels[t.status]}
									</Badge>
									{#if t.dueAt}
										<span
											>{shortDate(t.dueAt)}{#if t.daysUntilDue !== null}
												· {dueLabel(t.daysUntilDue)}{/if}</span
										>
									{/if}
									{#each t.tags as tag (tag)}
										<span class="chip">{tag}</span>
									{/each}
								</div>
							</a>
							<form method="post" action="?/togglePin">
								<input type="hidden" name="id" value={t.id} />
								<Button
									variant="ghost"
									size="icon-sm"
									class="tap-target {t.pinned ? 'text-primary' : 'text-muted-foreground'}"
									type="submit"
									aria-label={t.pinned ? 'Unpin' : 'Pin to top'}
									aria-pressed={!!t.pinned}
								>
									<Pin class={t.pinned ? 'fill-current' : ''} />
								</Button>
							</form>
						</div>
					</div>
				{/each}
			</AnimatedGroup>
		{/if}
	</section>
</div>
