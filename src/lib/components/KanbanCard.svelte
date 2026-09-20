<script lang="ts">
	import { formatRupiah } from '$lib/format';
	import type { TaskRow } from '$lib/server/kanban';

	let { task }: { task: TaskRow } = $props();

	const priorityClass: Record<string, string> = {
		low: 'badge-ghost',
		medium: 'badge-info',
		high: 'badge-error'
	};
	const priorityLabel: Record<string, string> = {
		low: 'Rendah',
		medium: 'Sedang',
		high: 'Tinggi'
	};

	const checklistDone = $derived(task.checklist.filter((i) => i.done).length);
	const checklistTotal = $derived(task.checklist.length);

	const isOverdue = $derived(
		task.dueDate !== null && task.status !== 'done' && new Date(task.dueDate) < new Date(todayStart())
	);

	function todayStart(): Date {
		const d = new Date();
		d.setHours(0, 0, 0, 0);
		return d;
	}

	function shortDate(iso: string): string {
		return new Date(iso).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
	}
</script>

<a
	href="/kanban/{task.id}"
	class="block cursor-grab rounded-box border border-base-300 bg-base-100 p-3 shadow-sm transition hover:border-primary/50 active:cursor-grabbing"
>
	<div class="flex items-start justify-between gap-2">
		<h3 class="min-w-0 flex-1 truncate text-sm font-medium">{task.title}</h3>
		<span class="badge badge-sm shrink-0 {priorityClass[task.priority]}">
			{priorityLabel[task.priority]}
		</span>
	</div>

	{#if task.description}
		<p class="mt-1 line-clamp-2 text-xs opacity-70">{task.description}</p>
	{/if}

	{#if task.tags.length > 0}
		<div class="mt-2 flex flex-wrap gap-1">
			{#each task.tags as tag}
				<span class="badge badge-ghost badge-sm">{tag}</span>
			{/each}
		</div>
	{/if}

	<div class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs opacity-70">
		{#if task.dueDate}
			<span class={isOverdue ? 'font-medium text-error' : ''}>
				📅 {shortDate(task.dueDate)}
			</span>
		{/if}
		{#if checklistTotal > 0}
			<span>☑ {checklistDone}/{checklistTotal}</span>
		{/if}
		{#if task.spend}
			<span class="opacity-80">💸 {formatRupiah(task.spend.amount)}</span>
		{/if}
	</div>
</a>
