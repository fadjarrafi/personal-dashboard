<script lang="ts">
	import type { ActionData, PageData } from './$types';
	import { formatRupiah } from '$lib/format';
	import NotificationSetup from '$lib/components/NotificationSetup.svelte';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let recurrence = $state('monthly');

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
	const statusLabels: Record<string, string> = {
		overdue: 'Overdue',
		due_soon: 'Due soon',
		upcoming: 'Upcoming'
	};
	const statusBadgeClass: Record<string, string> = {
		overdue: 'badge-error',
		due_soon: 'badge-warning',
		upcoming: 'badge-ghost'
	};

	function shortDate(iso: string): string {
		return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
	}

	function dueLabel(days: number): string {
		if (days < 0) return `${Math.abs(days)} day(s) overdue`;
		if (days === 0) return 'Due today';
		return `In ${days} day(s)`;
	}
</script>

<div class="grid gap-4 sm:gap-6 lg:grid-cols-[380px_1fr]">
	<aside class="order-2 space-y-3 lg:order-1 lg:sticky lg:top-4 lg:self-start">
		<section
			class="rounded-box border border-base-300 bg-base-200/60 p-4"
			aria-label="Bill notifications"
		>
			<h2 class="text-[10px] font-semibold uppercase tracking-wider opacity-50">Notifications</h2>
			<div class="mt-2">
				<NotificationSetup deviceCount={data.devices.length} />
			</div>
		</section>

		<section aria-labelledby="bill-add-heading">
			<h2
				id="bill-add-heading"
				class="mb-2 px-1 text-xs font-semibold uppercase tracking-wider opacity-60"
			>
				Add bill
			</h2>
			<form
				method="post"
				action="?/create"
				class="card space-y-2 border-l-2 border-l-[--color-accent] bg-base-200 p-3 sm:p-4"
			>
				<label class="form-control w-full">
					<div class="label py-1"><span class="label-text text-xs">Bill name</span></div>
					<input
						class="input input-bordered w-full"
						name="title"
						placeholder="PLN electricity, Internet, etc."
						required
						autocomplete="off"
					/>
				</label>

				<label class="form-control w-full">
					<div class="label py-1"><span class="label-text text-xs">Amount (Rp)</span></div>
					<input
						class="input input-bordered w-full"
						name="amount"
						inputmode="numeric"
						placeholder="350000"
						required
						autocomplete="off"
					/>
				</label>

				<label class="form-control w-full">
					<div class="label py-1"><span class="label-text text-xs">Due date</span></div>
					<input class="input input-bordered w-full" name="next_due_at" type="date" required />
				</label>

				<label class="form-control w-full">
					<div class="label py-1"><span class="label-text text-xs">Category</span></div>
					<select class="select select-bordered w-full" name="category">
						{#each data.categories as c}
							<option value={c}>{categoryLabels[c]}</option>
						{/each}
					</select>
				</label>

				<label class="form-control w-full">
					<div class="label py-1"><span class="label-text text-xs">Recurrence</span></div>
					<select class="select select-bordered w-full" name="recurrence" bind:value={recurrence}>
						{#each data.recurrences as r}
							<option value={r}>{recurrenceLabels[r]}</option>
						{/each}
					</select>
				</label>

				{#if recurrence === 'custom_days'}
					<label class="form-control w-full">
						<div class="label py-1"><span class="label-text text-xs">Interval (days)</span></div>
						<input
							class="input input-bordered w-full"
							name="interval_days"
							type="number"
							min="1"
							placeholder="14"
							required
						/>
					</label>
				{/if}

				<button class="btn btn-primary w-full" type="submit">Save</button>

				{#if form && 'error' in form && form.error}
					<div role="alert" class="alert alert-error py-2 text-sm">{form.error}</div>
				{/if}
			</form>
		</section>
	</aside>

	<section class="order-1 min-w-0 space-y-3 lg:order-2">
		<header class="px-1">
			<h1 class="text-lg font-semibold sm:text-xl">Bills</h1>
		</header>

		{#if data.bills.length === 0}
			<p class="rounded-box border border-dashed border-base-300 p-6 text-center text-sm opacity-60">
				No bills recorded yet.
			</p>
		{:else}
			<ul class="space-y-2" role="list">
				{#each data.bills as b (b.id)}
					<li class="rounded-box border border-base-300 bg-base-200/40 p-3">
						<div class="flex items-start justify-between gap-2">
							<a href="/bills/{b.id}" class="min-w-0 flex-1">
								<div class="truncate text-sm font-medium">{b.title}</div>
								<div class="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs opacity-70">
									<span class="badge badge-ghost badge-sm">{categoryLabels[b.category]}</span>
									<span class="badge {statusBadgeClass[b.status]} badge-sm">
										{statusLabels[b.status]}
									</span>
									<span>{shortDate(b.nextDueAt)} · {dueLabel(b.daysUntilDue)}</span>
									<span class="opacity-60">· {recurrenceLabels[b.recurrence]}</span>
								</div>
							</a>
							<div class="shrink-0 text-right">
								<div class="font-display text-sm font-semibold tabular-nums">
									{formatRupiah(b.amount)}
								</div>
							</div>
						</div>
						<div class="mt-2 flex justify-end gap-2">
							<form method="post" action="/bills/{b.id}?/markPaid">
								<button class="btn btn-success btn-sm tap-target" type="submit">Mark as paid</button>
							</form>
						</div>
					</li>
				{/each}
			</ul>
		{/if}
	</section>
</div>
