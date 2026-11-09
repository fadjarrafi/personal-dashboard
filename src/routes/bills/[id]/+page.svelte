<script lang="ts">
	import type { ActionData, PageData } from './$types';
	import ConfirmAction from '$lib/components/ConfirmAction.svelte';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { NativeSelect } from '$lib/components/ui/native-select/index.js';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import Check from '@lucide/svelte/icons/check';
	import AlarmClock from '@lucide/svelte/icons/alarm-clock';
	import Trash2 from '@lucide/svelte/icons/trash-2';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// svelte-ignore state_referenced_locally
	let recurrence = $state(data.bill.recurrence);

	const categoryLabels: Record<string, string> = {
		listrik: 'Electricity',
		internet: 'Internet',
		cicilan: 'Installment',
		langganan: 'Subscription',
		kartu_kredit: 'Credit Card',
		lainnya: 'Other'
	};
	const recurrenceLabels: Record<string, string> = {
		none: 'One-time',
		monthly: 'Monthly',
		weekly: 'Weekly',
		custom_days: 'Every N days'
	};
</script>

<div class="mx-auto max-w-lg space-y-4">
	<header class="space-y-1 px-1">
		<Button variant="ghost" size="sm" class="-ms-2" href="/bills"><ArrowLeft />Back to Bills</Button
		>
		<h1 class="text-lg font-semibold sm:text-xl">{data.bill.title}</h1>
	</header>

	<form method="post" action="?/update" class="bg-card space-y-4 rounded-lg border p-4">
		<div class="grid gap-1.5">
			<Label for="title">Bill name</Label>
			<Input id="title" name="title" value={data.bill.title} required />
		</div>

		<div class="grid gap-1.5">
			<Label for="amount">Amount (Rp)</Label>
			<Input id="amount" name="amount" inputmode="numeric" value={data.bill.amount} required />
		</div>

		<div class="grid gap-1.5">
			<Label for="next_due_at">Due date</Label>
			<Input
				id="next_due_at"
				name="next_due_at"
				type="date"
				value={data.bill.nextDueAt.slice(0, 10)}
				required
			/>
		</div>

		<div class="grid gap-1.5">
			<Label for="category">Category</Label>
			<NativeSelect id="category" class="w-full" name="category" value={data.bill.category}>
				{#each data.categories as c (c)}
					<option value={c}>{categoryLabels[c]}</option>
				{/each}
			</NativeSelect>
		</div>

		<div class="grid gap-1.5">
			<Label for="recurrence">Recurrence</Label>
			<NativeSelect id="recurrence" class="w-full" name="recurrence" bind:value={recurrence}>
				{#each data.recurrences as r (r)}
					<option value={r}>{recurrenceLabels[r]}</option>
				{/each}
			</NativeSelect>
		</div>

		{#if recurrence === 'custom_days'}
			<div class="grid gap-1.5">
				<Label for="interval_days">Interval (days)</Label>
				<Input
					id="interval_days"
					name="interval_days"
					type="number"
					min="1"
					value={data.bill.intervalDays ?? ''}
					required
				/>
			</div>
		{/if}

		<Button class="w-full" type="submit">Save changes</Button>

		{#if form && 'error' in form && form.error}
			<p role="alert" class="text-destructive text-sm">{form.error}</p>
		{/if}
	</form>

	<div class="flex flex-wrap gap-2">
		<form method="post" action="?/markPaid">
			<Button size="sm" class="tap-target" type="submit"><Check />Mark as paid</Button>
		</form>
		<form method="post" action="?/snooze">
			<Button variant="outline" size="sm" class="tap-target" type="submit">
				<AlarmClock />Remind me tomorrow
			</Button>
		</form>
		<ConfirmAction
			action="?/delete"
			title="Delete this bill?"
			description="The bill and its reminders are removed. This cannot be undone."
			confirmLabel="Delete"
			destructive
			size="sm"
			class="tap-target"
		>
			<Trash2 />Delete
		</ConfirmAction>
	</div>
</div>
