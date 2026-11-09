<script lang="ts">
	import type { ActionData, PageData } from './$types';
	import { formatRupiah } from '$lib/format';
	import ConfirmAction from '$lib/components/ConfirmAction.svelte';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import Trash2 from '@lucide/svelte/icons/trash-2';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	const spend = $derived(data.spend);

	const occurredDate = $derived(spend.occurredAt.slice(0, 10));
	const createdLabel = $derived(new Date(spend.createdAt).toLocaleString('en-GB'));
</script>

<div class="mx-auto max-w-2xl space-y-4">
	<div class="flex flex-wrap items-center justify-between gap-2">
		<h1 class="text-lg font-semibold sm:text-xl">Edit spending</h1>
		<Button variant="ghost" size="sm" class="tap-target" href="/spends"><ArrowLeft />Back</Button>
	</div>

	<Card.Root class="gap-1 py-4">
		<Card.Content class="px-4">
			<div class="label-mono">Current amount</div>
			<div class="text-2xl font-semibold tabular-nums">{formatRupiah(spend.amount)}</div>
			<div class="text-muted-foreground mt-1 text-xs">Created: {createdLabel}</div>
		</Card.Content>
	</Card.Root>

	<form method="post" action="?/update" id="spend-edit" class="space-y-4">
		<div class="grid gap-1.5">
			<Label for="amount">Amount (Rp)</Label>
			<Input id="amount" name="amount" inputmode="numeric" value={spend.amount} required />
		</div>

		<div class="grid gap-1.5">
			<Label for="occurred_at">Date</Label>
			<Input id="occurred_at" name="occurred_at" type="date" value={occurredDate} required />
		</div>

		<div class="grid gap-1.5">
			<Label for="category">Category</Label>
			<Input id="category" name="category" value={spend.category ?? ''} list="edit-categories" />
			<datalist id="edit-categories">
				{#each data.categories as c (c)}
					<option value={c}></option>
				{/each}
			</datalist>
		</div>

		<div class="grid gap-1.5">
			<Label for="merchant">Merchant</Label>
			<Input id="merchant" name="merchant" value={spend.merchant ?? ''} />
		</div>

		<div class="grid gap-1.5">
			<Label for="note">Note</Label>
			<Input id="note" name="note" value={spend.note ?? ''} />
		</div>

		<div class="grid gap-1.5">
			<Label for="method">Method</Label>
			<Input
				id="method"
				name="method"
				value={spend.method ?? ''}
				placeholder="gopay, blu, cash, etc."
			/>
		</div>

		{#if form?.error}
			<p role="alert" class="text-destructive text-sm">{form.error}</p>
		{/if}
	</form>

	<div class="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-between">
		<ConfirmAction
			action="?/delete"
			title="Delete this spending entry?"
			description="This permanently removes the entry. It cannot be undone."
			confirmLabel="Delete"
			destructive
		>
			<Trash2 />Delete
		</ConfirmAction>
		<div class="flex gap-2 sm:justify-end">
			<Button variant="ghost" class="flex-1 sm:flex-none" href="/spends">Cancel</Button>
			<Button class="flex-1 sm:flex-none" type="submit" form="spend-edit">Save</Button>
		</div>
	</div>
</div>
