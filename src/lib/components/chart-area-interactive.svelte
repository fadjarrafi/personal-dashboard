<script lang="ts">
	import { scaleUtc } from 'd3-scale';
	import { curveMonotoneX } from 'd3-shape';
	import { Area, AreaChart } from 'layerchart';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Chart from '$lib/components/ui/chart/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import * as ToggleGroup from '$lib/components/ui/toggle-group/index.js';
	import { InView } from '$lib/components/motion';
	import { formatRupiah } from '$lib/format';

	// Spend trend — dashboard-01 block "interactive area chart", fed with daily
	// spend totals (oldest → newest, one row per day, zero-filled).
	let { daily }: { daily: Array<{ date: string; total: number }> } = $props();

	const chartData = $derived(daily.map((d) => ({ date: new Date(d.date), spend: d.total })));

	let timeRange = $state('90d');

	const selectedLabel = $derived.by(() => {
		switch (timeRange) {
			case '90d':
				return 'Last 3 months';
			case '30d':
				return 'Last 30 days';
			case '7d':
				return 'Last 7 days';
			default:
				return 'Last 3 months';
		}
	});

	const days = $derived(timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90);
	const filteredData = $derived(chartData.slice(-days));
	const rangeTotal = $derived(filteredData.reduce((sum, d) => sum + d.spend, 0));
	// An all-zero range gives a [0, 0] y-domain, which renders nothing at all;
	// keep a floor so the empty chart still draws its baseline and axis.
	const yMax = $derived(Math.max(1000, ...filteredData.map((d) => d.spend)));

	const chartConfig = {
		spend: { label: 'Spend', color: 'var(--chart-1)' }
	} satisfies Chart.ChartConfig;

	const fmtDay = (v: Date) => v.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
</script>

<InView>
	<Card.Root class="@container/card">
		<Card.Header>
			<Card.Title>Spending trend</Card.Title>
			<Card.Description>
				<span class="tabular-nums">{formatRupiah(rangeTotal)}</span>
				<span class="hidden @[540px]/card:inline"> · {selectedLabel.toLowerCase()}</span>
			</Card.Description>
			<Card.Action>
				<ToggleGroup.Root
					type="single"
					bind:value={timeRange}
					variant="outline"
					class="hidden *:data-[slot=toggle-group-item]:!px-4 @[767px]/card:flex"
				>
					<ToggleGroup.Item value="90d">Last 3 months</ToggleGroup.Item>
					<ToggleGroup.Item value="30d">Last 30 days</ToggleGroup.Item>
					<ToggleGroup.Item value="7d">Last 7 days</ToggleGroup.Item>
				</ToggleGroup.Root>
				<Select.Root type="single" bind:value={timeRange}>
					<Select.Trigger
						size="sm"
						class="flex w-40 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden"
						aria-label="Select a value"
					>
						<span data-slot="select-value">
							{selectedLabel}
						</span>
					</Select.Trigger>
					<Select.Content class="rounded-xl">
						<Select.Item value="90d" class="rounded-lg">Last 3 months</Select.Item>
						<Select.Item value="30d" class="rounded-lg">Last 30 days</Select.Item>
						<Select.Item value="7d" class="rounded-lg">Last 7 days</Select.Item>
					</Select.Content>
				</Select.Root>
			</Card.Action>
		</Card.Header>
		<Card.Content class="px-2 pt-4 sm:px-6 sm:pt-6">
			<Chart.Container config={chartConfig} class="aspect-auto h-[250px] w-full">
				<AreaChart
					data={filteredData}
					x="date"
					xScale={scaleUtc()}
					yDomain={[0, yMax]}
					series={[{ key: 'spend', label: 'Spend', color: chartConfig.spend.color }]}
					props={{
						xAxis: {
							ticks: timeRange === '7d' ? 7 : undefined,
							format: fmtDay
						},
						yAxis: { format: () => '' }
					}}
				>
					{#snippet marks({ context })}
						<defs>
							<linearGradient id="fillSpend" x1="0" y1="0" x2="0" y2="1">
								<stop offset="5%" stop-color="var(--color-spend)" stop-opacity={0.8} />
								<stop offset="95%" stop-color="var(--color-spend)" stop-opacity={0.05} />
							</linearGradient>
						</defs>
						{#each context.series.visibleSeries as s (s.key)}
							<Area
								seriesKey={s.key}
								curve={curveMonotoneX}
								fillOpacity={0.4}
								line={{ class: 'stroke-1' }}
								motion="tween"
								{...s.props}
								fill="url(#fillSpend)"
							/>
						{/each}
					{/snippet}
					{#snippet tooltip()}
						<Chart.Tooltip labelFormatter={fmtDay} indicator="line">
							{#snippet formatter({ value })}
								<div class="flex w-full items-center justify-between gap-4">
									<span class="text-muted-foreground">Spend</span>
									<span class="font-medium tabular-nums">{formatRupiah(Number(value))}</span>
								</div>
							{/snippet}
						</Chart.Tooltip>
					{/snippet}
				</AreaChart>
			</Chart.Container>
		</Card.Content>
	</Card.Root>
</InView>
