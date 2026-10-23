<script lang="ts">
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const priorityLabels: Record<string, string> = {
		low: 'Low',
		normal: 'Normal',
		high: 'High'
	};
</script>

<div class="mx-auto max-w-lg space-y-4">
	<header class="px-1">
		<a href="/tasks" class="link text-sm opacity-70">← Back to Tasks</a>
		<h1 class="mt-1 text-lg font-semibold sm:text-xl">{data.task.title}</h1>
	</header>

	<form
		method="post"
		action="?/update"
		class="card space-y-3 border border-base-300 bg-base-200/40 p-4"
	>
		<label class="form-control w-full">
			<div class="label py-1"><span class="label-text text-xs">Title</span></div>
			<input class="input input-bordered w-full" name="title" value={data.task.title} required />
		</label>

		<label class="form-control w-full">
			<div class="label py-1"><span class="label-text text-xs">Notes</span></div>
			<textarea class="textarea textarea-bordered w-full" name="notes" rows="3"
				>{data.task.notes ?? ''}</textarea
			>
		</label>

		<label class="form-control w-full">
			<div class="label py-1"><span class="label-text text-xs">Due date (optional)</span></div>
			<input
				class="input input-bordered w-full"
				name="due_at"
				type="date"
				value={data.task.dueAt ? data.task.dueAt.slice(0, 10) : ''}
			/>
		</label>

		<label class="form-control w-full">
			<div class="label py-1"><span class="label-text text-xs">Priority</span></div>
			<select class="select select-bordered w-full" name="priority" value={data.task.priority}>
				{#each data.priorities as p}
					<option value={p}>{priorityLabels[p]}</option>
				{/each}
			</select>
		</label>

		<label class="form-control w-full">
			<div class="label py-1"><span class="label-text text-xs">Tags (comma-separated)</span></div>
			<input
				class="input input-bordered w-full"
				name="tags"
				value={data.task.tags.join(', ')}
				list="known-tags"
			/>
			<datalist id="known-tags">
				{#each data.tags as t}
					<option value={t}></option>
				{/each}
			</datalist>
		</label>

		<label class="label cursor-pointer justify-start gap-2">
			<input
				type="checkbox"
				name="pinned"
				class="checkbox checkbox-primary"
				checked={!!data.task.pinned}
			/>
			<span class="label-text">Pin to top</span>
		</label>

		<button class="btn btn-primary w-full" type="submit">Save changes</button>

		{#if form && 'error' in form && form.error}
			<div role="alert" class="alert alert-error py-2 text-sm">{form.error}</div>
		{/if}
	</form>

	<div class="flex flex-wrap gap-2">
		<form method="post" action="?/toggleDone">
			<button class="btn btn-success btn-sm tap-target" type="submit">
				{data.task.doneAt ? 'Mark as not done' : 'Mark as done'}
			</button>
		</form>
		<form
			method="post"
			action="?/archive"
			onsubmit={(e) => {
				if (!confirm('Archive this task?')) e.preventDefault();
			}}
		>
			<button class="btn btn-ghost btn-sm tap-target" type="submit">Archive</button>
		</form>
		<form
			method="post"
			action="?/delete"
			onsubmit={(e) => {
				if (!confirm('Delete this task?')) e.preventDefault();
			}}
		>
			<button class="btn btn-error btn-outline btn-sm tap-target" type="submit">Delete</button>
		</form>
	</div>
</div>
