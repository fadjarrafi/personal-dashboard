<script lang="ts">
	// Stat tiles — dashboard-01 block "section cards", fed with real data.
	import TrendingDown from '@lucide/svelte/icons/trending-down';
	import TrendingUp from '@lucide/svelte/icons/trending-up';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { AnimatedNumber } from '$lib/components/motion';
	import { formatRupiah } from '$lib/format';

	interface Props {
		spend: { total: number; previousTotal: number; count: number };
		items: { bookmark: number; note: number; snippet: number };
		bills: { overdue: number; dueSoon: number };
		tasks: { open: number; overdue: number };
	}

	let { spend, items, bills, tasks }: Props = $props();

	const spendDelta = $derived(
		spend.previousTotal > 0
			? Math.round(((spend.total - spend.previousTotal) / spend.previousTotal) * 100)
			: null
	);
	const itemTotal = $derived(items.bookmark + items.note + items.snippet);
</script>

<div class="grid grid-cols-1 gap-3 lg:gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
	<Card.Root class="@container/card gap-3">
		<Card.Header>
			<Card.Description>Spending this month</Card.Description>
			<Card.Title class="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
				<AnimatedNumber value={spend.total} format={formatRupiah} />
			</Card.Title>
			{#if spendDelta !== null}
				<Card.Action>
					<!-- Spending going up is the "bad" direction. -->
					<Badge variant="outline" class={spendDelta > 0 ? 'text-warning' : 'text-success'}>
						{#if spendDelta > 0}<TrendingUp />{:else}<TrendingDown />{/if}
						{spendDelta > 0 ? '+' : ''}{spendDelta}%
					</Badge>
				</Card.Action>
			{/if}
		</Card.Header>
		<Card.Footer class="flex-col items-start gap-1 text-sm">
			<div class="text-muted-foreground">
				{spend.count} transaction{spend.count === 1 ? '' : 's'} · vs {formatRupiah(
					spend.previousTotal
				)} last month
			</div>
			<a href="/spends" class="text-primary text-xs underline-offset-4 hover:underline">
				Open spending →
			</a>
		</Card.Footer>
	</Card.Root>

	<Card.Root class="@container/card gap-3">
		<Card.Header>
			<Card.Description>Catalog items</Card.Description>
			<Card.Title class="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
				<AnimatedNumber value={itemTotal} />
			</Card.Title>
		</Card.Header>
		<Card.Footer class="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-sm">
			<span class="flex items-center gap-1.5">
				<span class="cat-dot text-cat-bookmark" aria-hidden="true"></span>{items.bookmark} bookmark
			</span>
			<span class="flex items-center gap-1.5">
				<span class="cat-dot text-cat-note" aria-hidden="true"></span>{items.note} note
			</span>
			<span class="flex items-center gap-1.5">
				<span class="cat-dot text-cat-snippet" aria-hidden="true"></span>{items.snippet} snippet
			</span>
		</Card.Footer>
	</Card.Root>

	<Card.Root class="@container/card gap-3">
		<Card.Header>
			<Card.Description>Bills needing attention</Card.Description>
			<Card.Title class="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
				<AnimatedNumber value={bills.overdue + bills.dueSoon} />
			</Card.Title>
			{#if bills.overdue > 0}
				<Card.Action>
					<Badge variant="destructive">{bills.overdue} overdue</Badge>
				</Card.Action>
			{/if}
		</Card.Header>
		<Card.Footer class="flex-col items-start gap-1 text-sm">
			<div class="text-muted-foreground">{bills.dueSoon} due soon</div>
			<a href="/bills" class="text-primary text-xs underline-offset-4 hover:underline">
				Open bills →
			</a>
		</Card.Footer>
	</Card.Root>

	<Card.Root class="@container/card gap-3">
		<Card.Header>
			<Card.Description>Open tasks</Card.Description>
			<Card.Title class="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
				<AnimatedNumber value={tasks.open} />
			</Card.Title>
			{#if tasks.overdue > 0}
				<Card.Action>
					<Badge variant="destructive">{tasks.overdue} overdue</Badge>
				</Card.Action>
			{/if}
		</Card.Header>
		<Card.Footer class="flex-col items-start gap-1 text-sm">
			<div class="text-muted-foreground">Not done, not archived</div>
			<a href="/tasks" class="text-primary text-xs underline-offset-4 hover:underline">
				Open tasks →
			</a>
		</Card.Footer>
	</Card.Root>
</div>
