<script lang="ts">
	import { dndzone } from 'svelte-dnd-action';
	import { invalidateAll } from '$app/navigation';
	import type { ActionData, PageData } from './$types';
	import KanbanCard from '$lib/components/KanbanCard.svelte';
	import type { TaskRow, TaskStatus } from '$lib/server/kanban';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const COLUMNS: Array<{ status: TaskStatus; label: string }> = [
		{ status: 'todo', label: 'Todo' },
		{ status: 'in_progress', label: 'In Progress' },
		{ status: 'done', label: 'Done' }
	];

	let todo = $state<TaskRow[]>(data.columns.todo);
	let inProgress = $state<TaskRow[]>(data.columns.in_progress);
	let done = $state<TaskRow[]>(data.columns.done);

	// Resync lokal state dari server truth setelah invalidateAll() (mis. rollback
	// reorder yang gagal) atau navigasi client-side ke /kanban dari route lain.
	$effect(() => {
		todo = data.columns.todo;
		inProgress = data.columns.in_progress;
		done = data.columns.done;
	});

	function listFor(status: TaskStatus): TaskRow[] {
		if (status === 'todo') return todo;
		if (status === 'in_progress') return inProgress;
		return done;
	}
	function setFor(status: TaskStatus, items: TaskRow[]) {
		if (status === 'todo') todo = items;
		else if (status === 'in_progress') inProgress = items;
		else done = items;
	}

	const flipDurationMs = 150;

	function handleConsider(status: TaskStatus, e: CustomEvent<{ items: TaskRow[] }>) {
		setFor(status, e.detail.items);
	}

	async function handleFinalize(status: TaskStatus, e: CustomEvent<{ items: TaskRow[] }>) {
		setFor(status, e.detail.items);
		const orderedIds = e.detail.items.map((t) => t.id);
		try {
			const res = await fetch('/kanban/reorder', {
				method: 'PATCH',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ status, orderedIds })
			});
			if (!res.ok) throw new Error('reorder failed');
		} catch {
			// Rollback: refetch server truth kalau request gagal.
			await invalidateAll();
		}
	}
</script>

<div class="space-y-4">
	<header class="flex items-center justify-between px-1">
		<h1 class="text-lg font-semibold sm:text-xl">Kanban Board</h1>
	</header>

	{#if form && 'error' in form && form.error}
		<div role="alert" class="alert alert-error py-2 text-sm">{form.error}</div>
	{/if}

	<div class="grid gap-3 sm:gap-4 md:grid-cols-3">
		{#each COLUMNS as col (col.status)}
			<section class="flex min-w-0 flex-col rounded-box border border-base-300 bg-base-200/40 p-2 sm:p-3">
				<div class="mb-2 flex items-center justify-between px-1">
					<h2 class="text-xs font-semibold uppercase tracking-wider opacity-70">
						{col.label}
					</h2>
					<span class="badge badge-ghost badge-sm">{listFor(col.status).length}</span>
				</div>

				<ul
					class="flex min-h-16 flex-1 flex-col gap-2"
					use:dndzone={{ items: listFor(col.status), flipDurationMs }}
					onconsider={(e) => handleConsider(col.status, e)}
					onfinalize={(e) => handleFinalize(col.status, e)}
				>
					{#each listFor(col.status) as task (task.id)}
						<li>
							<KanbanCard {task} />
						</li>
					{/each}
				</ul>

				<form method="post" action="?/create" class="mt-2 flex gap-1">
					<input type="hidden" name="status" value={col.status} />
					<input
						class="input input-sm input-bordered w-full"
						name="title"
						placeholder="+ Tambah task"
						autocomplete="off"
						required
					/>
					<button class="btn btn-sm btn-primary" type="submit">+</button>
				</form>
			</section>
		{/each}
	</div>
</div>
