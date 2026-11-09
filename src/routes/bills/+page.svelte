<script lang="ts">
	import type { ActionData, PageData } from './$types';
	import { formatRupiah } from '$lib/format';
	import NotificationSetup from '$lib/components/NotificationSetup.svelte';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Badge, type BadgeVariant } from '$lib/components/ui/badge/index.js';
	import { NativeSelect } from '$lib/components/ui/native-select/index.js';
	import { AnimatedGroup } from '$lib/components/motion';
	import Check from '@lucide/svelte/icons/check';

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
	const statusBadge: Record<string, { variant: BadgeVariant; class?: string }> = {
		overdue: { variant: 'destructive' },
		due_soon: { variant: 'outline', class: 'border-warning/40 text-warning' },
		upcoming: { variant: 'secondary' }
	};

	function shortDate(iso: string): string {
		return new Date(iso).toLocaleDateString('en-GB', {
			day: '2-digit',
			month: 'short',
			year: 'numeric'
		});
	}

	function dueLabel(days: number): string {
		if (days < 0) return `${Math.abs(days)} day(s) overdue`;
		if (days === 0) return 'Due today';
		return `In ${days} day(s)`;
	}
</script>

<div class="grid gap-4 sm:gap-6 lg:grid-cols-[380px_1fr]">
	<aside
		class="order-2 space-y-4 lg:sticky lg:top-[calc(var(--header-height)+1rem)] lg:order-1 lg:self-start"
	>
		<Card.Root class="gap-3 py-4" aria-label="Bill notifications">
			<Card.Header class="px-4">
				<Card.Description class="label-mono">Notifications</Card.Description>
			</Card.Header>
			<Card.Content class="px-4">
				<NotificationSetup deviceCount={data.devices.length} />
			</Card.Content>
		</Card.Root>

		<section aria-labelledby="bill-add-heading" class="space-y-2">
			<h2 id="bill-add-heading" class="label-mono px-1">Add bill</h2>
			<form method="post" action="?/create" class="bg-card space-y-3 rounded-lg border p-3 sm:p-4">
				<div class="grid gap-1.5">
					<Label for="bill-title">Bill name</Label>
					<Input
						id="bill-title"
						name="title"
						placeholder="PLN electricity, Internet, etc."
						required
						autocomplete="off"
					/>
				</div>

				<div class="grid gap-1.5">
					<Label for="bill-amount">Amount (Rp)</Label>
					<Input
						id="bill-amount"
						name="amount"
						inputmode="numeric"
						placeholder="350000"
						required
						autocomplete="off"
					/>
				</div>

				<div class="grid gap-1.5">
					<Label for="bill-due">Due date</Label>
					<Input id="bill-due" name="next_due_at" type="date" required />
				</div>

				<div class="grid gap-1.5">
					<Label for="bill-category">Category</Label>
					<NativeSelect id="bill-category" class="w-full" name="category">
						{#each data.categories as c (c)}
							<option value={c}>{categoryLabels[c]}</option>
						{/each}
					</NativeSelect>
				</div>

				<div class="grid gap-1.5">
					<Label for="bill-recurrence">Recurrence</Label>
					<NativeSelect
						id="bill-recurrence"
						class="w-full"
						name="recurrence"
						bind:value={recurrence}
					>
						{#each data.recurrences as r (r)}
							<option value={r}>{recurrenceLabels[r]}</option>
						{/each}
					</NativeSelect>
				</div>

				{#if recurrence === 'custom_days'}
					<div class="grid gap-1.5">
						<Label for="bill-interval">Interval (days)</Label>
						<Input
							id="bill-interval"
							name="interval_days"
							type="number"
							min="1"
							placeholder="14"
							required
						/>
					</div>
				{/if}

				<Button class="w-full" type="submit">Save</Button>

				{#if form && 'error' in form && form.error}
					<p role="alert" class="text-destructive text-sm">{form.error}</p>
				{/if}
			</form>
		</section>
	</aside>

	<section class="order-1 min-w-0 space-y-3 lg:order-2">
		{#if data.bills.length === 0}
			<p class="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
				No bills recorded yet.
			</p>
		{:else}
			<AnimatedGroup class="space-y-2">
				{#each data.bills as b (b.id)}
					<div
						class="bg-card rounded-lg border p-3 {b.status === 'overdue'
							? 'border-l-destructive border-l-2'
							: b.status === 'due_soon'
								? 'border-l-warning border-l-2'
								: ''}"
					>
						<div class="flex items-start justify-between gap-2">
							<a href="/bills/{b.id}" class="min-w-0 flex-1">
								<div class="truncate text-sm font-medium">{b.title}</div>
								<div
									class="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs"
								>
									<Badge variant="secondary">{categoryLabels[b.category]}</Badge>
									<Badge
										variant={statusBadge[b.status].variant}
										class={statusBadge[b.status].class}
									>
										{statusLabels[b.status]}
									</Badge>
									<span>{shortDate(b.nextDueAt)} · {dueLabel(b.daysUntilDue)}</span>
									<span>· {recurrenceLabels[b.recurrence]}</span>
								</div>
							</a>
							<div class="shrink-0 text-right text-sm font-semibold tabular-nums">
								{formatRupiah(b.amount)}
							</div>
						</div>
						<div class="mt-2 flex justify-end gap-2">
							<form method="post" action="/bills/{b.id}?/markPaid">
								<Button variant="outline" size="sm" class="tap-target" type="submit">
									<Check />Mark as paid
								</Button>
							</form>
						</div>
					</div>
				{/each}
			</AnimatedGroup>
		{/if}
	</section>
</div>
