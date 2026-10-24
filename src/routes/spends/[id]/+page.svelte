<script lang="ts">
	import type { ActionData, PageData } from './$types';
	import { formatRupiah } from '$lib/format';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	const spend = $derived(data.spend);

	const occurredDate = $derived(spend.occurredAt.slice(0, 10));
	const createdLabel = $derived(new Date(spend.createdAt).toLocaleString('en-GB'));
</script>

<div class="mx-auto max-w-2xl">
	<div class="mb-4 flex flex-wrap items-center justify-between gap-2">
		<h1 class="text-lg font-semibold sm:text-xl">Edit spending</h1>
		<a class="btn btn-ghost btn-sm tap-target" href="/spends">← Back</a>
	</div>

	<div class="mb-4 rounded-box border border-base-300 bg-base-200/40 p-3 text-sm">
		<div class="text-xs opacity-60">Current amount</div>
		<div class="font-display text-2xl font-semibold tabular-nums">{formatRupiah(spend.amount)}</div>
		<div class="mt-1 text-xs opacity-50">Created: {createdLabel}</div>
	</div>

	<form method="post" action="?/update" class="space-y-3">
		<label class="form-control w-full">
			<div class="label"><span class="label-text">Amount (Rp)</span></div>
			<input
				class="input input-bordered w-full"
				name="amount"
				inputmode="numeric"
				value={spend.amount}
				required
			/>
		</label>

		<label class="form-control w-full">
			<div class="label"><span class="label-text">Date</span></div>
			<input
				class="input input-bordered w-full"
				name="occurred_at"
				type="date"
				value={occurredDate}
				required
			/>
		</label>

		<label class="form-control w-full">
			<div class="label"><span class="label-text">Category</span></div>
			<input
				class="input input-bordered w-full"
				name="category"
				value={spend.category ?? ''}
				list="edit-categories"
			/>
			<datalist id="edit-categories">
				{#each data.categories as c}
					<option value={c}></option>
				{/each}
			</datalist>
		</label>

		<label class="form-control w-full">
			<div class="label"><span class="label-text">Merchant</span></div>
			<input
				class="input input-bordered w-full"
				name="merchant"
				value={spend.merchant ?? ''}
			/>
		</label>

		<label class="form-control w-full">
			<div class="label"><span class="label-text">Note</span></div>
			<input class="input input-bordered w-full" name="note" value={spend.note ?? ''} />
		</label>

		<label class="form-control w-full">
			<div class="label"><span class="label-text">Method</span></div>
			<input
				class="input input-bordered w-full"
				name="method"
				value={spend.method ?? ''}
				placeholder="gopay, blu, cash, etc."
			/>
		</label>

		{#if form?.error}
			<div role="alert" class="alert alert-error py-2 text-sm">{form.error}</div>
		{/if}

		<div class="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-between">
			<button
				formaction="?/delete"
				formmethod="post"
				class="btn btn-error btn-outline"
				onclick={(e) => {
					if (!confirm('Permanently delete this spending entry?')) e.preventDefault();
				}}
			>
				Delete
			</button>
			<div class="flex gap-2 sm:justify-end">
				<a class="btn btn-ghost flex-1 sm:flex-none" href="/spends">Cancel</a>
				<button class="btn btn-primary flex-1 sm:flex-none" type="submit">Save</button>
			</div>
		</div>
	</form>
</div>
