<script lang="ts">
	import type { ActionData, PageData } from './$types';
	import ConfirmAction from '$lib/components/ConfirmAction.svelte';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Checkbox } from '$lib/components/ui/checkbox/index.js';
	import { NativeSelect } from '$lib/components/ui/native-select/index.js';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import Check from '@lucide/svelte/icons/check';
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
	import Archive from '@lucide/svelte/icons/archive';
	import Trash2 from '@lucide/svelte/icons/trash-2';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const priorityLabels: Record<string, string> = {
		low: 'Low',
		normal: 'Normal',
		high: 'High'
	};
</script>

<div class="mx-auto max-w-lg space-y-4">
	<header class="space-y-1 px-1">
		<Button variant="ghost" size="sm" class="-ms-2" href="/tasks"><ArrowLeft />Back to Tasks</Button
		>
		<h1 class="text-lg font-semibold sm:text-xl">{data.task.title}</h1>
	</header>

	<form method="post" action="?/update" class="bg-card space-y-4 rounded-lg border p-4">
		<div class="grid gap-1.5">
			<Label for="title">Title</Label>
			<Input id="title" name="title" value={data.task.title} required />
		</div>

		<div class="grid gap-1.5">
			<Label for="notes">Notes</Label>
			<Textarea id="notes" name="notes" rows={3} value={data.task.notes ?? ''} />
		</div>

		<div class="grid gap-1.5">
			<Label for="due_at">Due date (optional)</Label>
			<Input
				id="due_at"
				name="due_at"
				type="date"
				value={data.task.dueAt ? data.task.dueAt.slice(0, 10) : ''}
			/>
		</div>

		<div class="grid gap-1.5">
			<Label for="priority">Priority</Label>
			<NativeSelect id="priority" class="w-full" name="priority" value={data.task.priority}>
				{#each data.priorities as p (p)}
					<option value={p}>{priorityLabels[p]}</option>
				{/each}
			</NativeSelect>
		</div>

		<div class="grid gap-1.5">
			<Label for="tags">Tags (comma-separated)</Label>
			<Input id="tags" name="tags" value={data.task.tags.join(', ')} list="known-tags" />
			<datalist id="known-tags">
				{#each data.tags as t (t)}
					<option value={t}></option>
				{/each}
			</datalist>
		</div>

		<div class="flex items-center gap-2">
			<Checkbox id="pinned" name="pinned" checked={!!data.task.pinned} />
			<Label for="pinned" class="font-normal">Pin to top</Label>
		</div>

		<Button class="w-full" type="submit">Save changes</Button>

		{#if form && 'error' in form && form.error}
			<p role="alert" class="text-destructive text-sm">{form.error}</p>
		{/if}
	</form>

	<div class="flex flex-wrap gap-2">
		<form method="post" action="?/toggleDone">
			<Button
				size="sm"
				variant={data.task.doneAt ? 'outline' : 'default'}
				class="tap-target"
				type="submit"
			>
				{#if data.task.doneAt}<RotateCcw />Mark as not done{:else}<Check />Mark as done{/if}
			</Button>
		</form>
		<ConfirmAction
			action="?/archive"
			title="Archive this task?"
			description="It moves to Archive, where you can restore or delete it."
			confirmLabel="Archive"
			variant="ghost"
			size="sm"
			class="tap-target"
		>
			<Archive />Archive
		</ConfirmAction>
		<ConfirmAction
			action="?/delete"
			title="Delete this task?"
			description="This permanently removes the task. It cannot be undone."
			confirmLabel="Delete"
			destructive
			size="sm"
			class="tap-target"
		>
			<Trash2 />Delete
		</ConfirmAction>
	</div>
</div>
