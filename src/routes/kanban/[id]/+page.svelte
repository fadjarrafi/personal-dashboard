<script lang="ts">
	import type { ActionData, PageData } from './$types';
	import ConfirmAction from '$lib/components/ConfirmAction.svelte';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { NativeSelect } from '$lib/components/ui/native-select/index.js';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import Archive from '@lucide/svelte/icons/archive';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import Check from '@lucide/svelte/icons/check';
	import X from '@lucide/svelte/icons/x';
	import Plus from '@lucide/svelte/icons/plus';
	import { formatRupiah } from '$lib/format';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	const task = $derived(data.task);
	const tagsValue = $derived(task.tags.join(', '));
</script>

<div class="mx-auto max-w-2xl space-y-4">
	<div class="flex flex-wrap items-center justify-between gap-2">
		<h1 class="text-lg font-semibold sm:text-xl">Edit task</h1>
		<Button variant="ghost" size="sm" class="tap-target" href="/kanban">
			<ArrowLeft />Back to board
		</Button>
	</div>

	<form method="post" action="?/update" id="kanban-edit" class="space-y-4">
		<div class="grid gap-1.5">
			<Label for="title">Title</Label>
			<Input id="title" name="title" value={task.title} required />
		</div>

		<div class="grid gap-1.5">
			<Label for="description">Description</Label>
			<Textarea id="description" name="description" rows={3} value={task.description ?? ''} />
		</div>

		<div class="grid grid-cols-2 gap-3">
			<div class="grid gap-1.5">
				<Label for="priority">Priority</Label>
				<NativeSelect id="priority" class="w-full" name="priority" value={task.priority}>
					<option value="low">Low</option>
					<option value="medium">Medium</option>
					<option value="high">High</option>
				</NativeSelect>
			</div>

			<div class="grid gap-1.5">
				<Label for="due_date">Due date</Label>
				<Input id="due_date" name="due_date" type="date" value={task.dueDate ?? ''} />
			</div>
		</div>

		<div class="grid gap-1.5">
			<Label for="tags">Tags (comma-separated)</Label>
			<Input id="tags" name="tags" value={tagsValue} list="kanban-tags" autocomplete="off" />
			<datalist id="kanban-tags">
				{#each data.tagsList as t (t)}
					<option value={t}></option>
				{/each}
			</datalist>
		</div>

		<div class="grid gap-1.5">
			<Label for="spend_id">Link to a spending entry (optional)</Label>
			<NativeSelect id="spend_id" class="w-full" name="spend_id" value={task.spendId ?? ''}>
				<option value="">— none —</option>
				{#each data.spendOptions as s (s.id)}
					<option value={s.id}>
						{formatRupiah(s.amount)} · {s.merchant ?? s.note ?? s.occurredAt.slice(0, 10)}
					</option>
				{/each}
			</NativeSelect>
		</div>

		{#if form && 'error' in form && form.error}
			<p role="alert" class="text-destructive text-sm">{form.error}</p>
		{/if}
	</form>

	<div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
		<div class="flex gap-2">
			<form method="post" action="?/archive">
				<Button variant="outline" type="submit"><Archive />Archive</Button>
			</form>
			<ConfirmAction
				action="?/delete"
				title="Permanently delete this task?"
				description="The task and its checklist are removed. This cannot be undone."
				confirmLabel="Delete"
				destructive
			>
				<Trash2 />Delete
			</ConfirmAction>
		</div>
		<div class="flex gap-2 sm:justify-end">
			<Button variant="ghost" class="flex-1 sm:flex-none" href="/kanban">Cancel</Button>
			<Button class="flex-1 sm:flex-none" type="submit" form="kanban-edit">Save</Button>
		</div>
	</div>

	<section class="bg-card space-y-2 rounded-lg border p-3">
		<h2 class="label-mono">Checklist</h2>

		{#if task.checklist.length > 0}
			<ul class="space-y-1">
				{#each task.checklist as item (item.id)}
					<li class="flex items-center gap-2">
						<form method="post" action="?/toggleChecklistItem" class="contents">
							<input type="hidden" name="item_id" value={item.id} />
							<button
								type="submit"
								class="tap-target flex items-center justify-center"
								aria-pressed={!!item.done}
								aria-label={item.done ? 'Mark as not done' : 'Mark as done'}
							>
								<span
									class="flex size-5 items-center justify-center rounded-sm border transition-colors {item.done
										? 'border-primary bg-primary text-primary-foreground'
										: 'border-input hover:border-ring'}"
								>
									{#if item.done}<Check class="size-3.5" />{/if}
								</span>
							</button>
						</form>
						<span class="flex-1 text-sm {item.done ? 'text-muted-foreground line-through' : ''}">
							{item.content}
						</span>
						<form method="post" action="?/deleteChecklistItem" class="contents">
							<input type="hidden" name="item_id" value={item.id} />
							<Button
								variant="ghost"
								size="icon-sm"
								class="tap-target text-muted-foreground"
								type="submit"
								aria-label="Delete item"
							>
								<X />
							</Button>
						</form>
					</li>
				{/each}
			</ul>
		{:else}
			<p class="text-muted-foreground text-xs">No checklist items yet.</p>
		{/if}

		<form method="post" action="?/addChecklistItem" class="flex gap-1">
			<Input
				class="h-8"
				name="content"
				placeholder="Add checklist item"
				aria-label="New checklist item"
				autocomplete="off"
				required
			/>
			<Button size="icon-sm" type="submit" aria-label="Add checklist item"><Plus /></Button>
		</form>
	</section>
</div>
