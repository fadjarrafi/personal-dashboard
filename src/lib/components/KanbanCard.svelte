<script lang="ts">
	import { formatRupiah } from '$lib/format';
	import { Badge, type BadgeVariant } from '$lib/components/ui/badge/index.js';
	import Calendar from '@lucide/svelte/icons/calendar';
	import ListChecks from '@lucide/svelte/icons/list-checks';
	import Wallet from '@lucide/svelte/icons/wallet';
	import type { TaskRow } from '$lib/server/kanban';

	let { task }: { task: TaskRow } = $props();

	const priorityVariant: Record<string, BadgeVariant> = {
		low: 'secondary',
		medium: 'outline',
		high: 'destructive'
	};
	const priorityLabel: Record<string, string> = {
		low: 'Low',
		medium: 'Medium',
		high: 'High'
	};

	const checklistDone = $derived(task.checklist.filter((i) => i.done).length);
	const checklistTotal = $derived(task.checklist.length);

	const isOverdue = $derived(
		task.dueDate !== null &&
			task.status !== 'done' &&
			new Date(task.dueDate) < new Date(todayStart())
	);

	function todayStart(): Date {
		const d = new Date();
		d.setHours(0, 0, 0, 0);
		return d;
	}

	function shortDate(iso: string): string {
		return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
	}
</script>

<a
	href="/kanban/{task.id}"
	class="bg-card hover:border-ring/40 block cursor-grab rounded-md border p-3 transition-colors active:cursor-grabbing"
>
	<div class="flex items-start justify-between gap-2">
		<h3 class="min-w-0 flex-1 truncate text-sm font-medium">{task.title}</h3>
		<Badge variant={priorityVariant[task.priority]} class="shrink-0">
			{priorityLabel[task.priority]}
		</Badge>
	</div>

	{#if task.description}
		<p class="text-muted-foreground mt-1 line-clamp-2 text-xs">{task.description}</p>
	{/if}

	{#if task.tags.length > 0}
		<div class="mt-2 flex flex-wrap gap-1">
			{#each task.tags as tag (tag)}
				<Badge variant="secondary">{tag}</Badge>
			{/each}
		</div>
	{/if}

	<div class="text-muted-foreground mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
		{#if task.dueDate}
			<span class="flex items-center gap-1 {isOverdue ? 'text-destructive font-medium' : ''}">
				<Calendar class="size-3.5" />{shortDate(task.dueDate)}
			</span>
		{/if}
		{#if checklistTotal > 0}
			<span class="flex items-center gap-1">
				<ListChecks class="size-3.5" />{checklistDone}/{checklistTotal}
			</span>
		{/if}
		{#if task.spend}
			<span class="flex items-center gap-1">
				<Wallet class="size-3.5" />{formatRupiah(task.spend.amount)}
			</span>
		{/if}
	</div>
</a>
