<script lang="ts">
	import type { ActionData, PageData } from './$types';
	import { formatRupiah } from '$lib/format';
	import SpendChart from '$lib/components/SpendChart.svelte';
	import MonthlySpendChart from '$lib/components/MonthlySpendChart.svelte';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Table from '$lib/components/ui/table/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import { AnimatedNumber } from '$lib/components/motion';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import Search from '@lucide/svelte/icons/search';
	import Plus from '@lucide/svelte/icons/plus';
	import TrendingUp from '@lucide/svelte/icons/trending-up';
	import TrendingDown from '@lucide/svelte/icons/trending-down';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const [year, monthNum] = $derived(data.filters.month.split('-').map(Number));
	const monthLabel = $derived(
		new Date(year, monthNum - 1, 1).toLocaleString('en-GB', {
			month: 'long',
			year: 'numeric'
		})
	);

	function prevMonthLabel(month: string): string {
		const [y, m] = month.split('-').map(Number);
		const d = new Date(y, m - 2, 1);
		return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
	}
	function nextMonthLabel(month: string): string {
		const [y, m] = month.split('-').map(Number);
		const d = new Date(y, m, 1);
		return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
	}

	function diffPercent(current: number, prev: number): number | null {
		if (prev === 0) return null;
		return Math.round(((current - prev) / prev) * 100);
	}

	const trend = $derived(diffPercent(data.summary.total, data.summary.previousTotal));
	const currentMonth = $derived(data.today.slice(0, 7));

	function shortDate(iso: string): string {
		const d = new Date(iso);
		return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
	}

	// Merge sebuah override ke atas filter yang sedang aktif, supaya navigasi
	// bulan/kategori tidak menghapus pencarian yang sedang berjalan (dan
	// sebaliknya). Kunci yang di-set ke undefined berarti "hapus filter itu".
	function buildQuery(overrides: { month?: string; category?: string; q?: string } = {}): string {
		const month = 'month' in overrides ? overrides.month : data.filters.month;
		const category = 'category' in overrides ? overrides.category : data.filters.category;
		const q = 'q' in overrides ? overrides.q : data.filters.q;
		const params = new URLSearchParams();
		if (month) params.set('month', month);
		if (category) params.set('category', category);
		if (q) params.set('q', q);
		return params.toString();
	}
</script>

<div class="grid gap-4 sm:gap-6 lg:grid-cols-[380px_1fr]">
	<!-- Sidebar / summary + form -->
	<aside
		class="order-2 space-y-4 lg:sticky lg:top-[calc(var(--header-height)+1rem)] lg:order-1 lg:self-start"
	>
		<!-- Ringkasan -->
		<Card.Root class="gap-3 py-4" aria-label="Current month summary">
			<Card.Header class="px-4">
				<Card.Description class="label-mono">Summary · {monthLabel}</Card.Description>
				<Card.Title class="text-3xl font-semibold tabular-nums">
					<AnimatedNumber value={data.summary.total} format={formatRupiah} />
				</Card.Title>
			</Card.Header>
			<Card.Content class="space-y-3 px-4">
				<div class="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
					<span>{data.summary.count} transaction(s)</span>
					{#if trend !== null}
						<span class="flex items-center gap-1 {trend > 0 ? 'text-warning' : 'text-success'}">
							{#if trend > 0}<TrendingUp class="size-3.5" />{:else}<TrendingDown
									class="size-3.5"
								/>{/if}
							{Math.abs(trend)}% vs last month
						</span>
					{:else if data.summary.previousTotal === 0 && data.summary.total > 0}
						<span>last month: —</span>
					{/if}
				</div>

				{#if data.summary.byCategory.length > 0}
					<Separator />
					<div class="label-mono">By category</div>
					<ul class="space-y-0.5 text-xs">
						{#each data.summary.byCategory as row (row.category)}
							{@const pct =
								data.summary.total > 0 ? Math.round((row.total / data.summary.total) * 100) : 0}
							<li>
								<a
									href="/spends?{buildQuery({ category: row.category })}"
									class="hover:bg-accent flex items-center justify-between gap-2 rounded-sm px-1.5 py-1"
								>
									<span class="min-w-0 truncate">{row.category}</span>
									<span class="shrink-0 tabular-nums">
										{formatRupiah(row.total)}
										<span class="text-muted-foreground">({pct}%)</span>
									</span>
								</a>
							</li>
						{/each}
					</ul>
				{/if}
			</Card.Content>
		</Card.Root>

		<!-- Quick add -->
		<section aria-labelledby="quick-add-heading" class="space-y-2">
			<h2 id="quick-add-heading" class="label-mono px-1">Quick add</h2>
			<form
				id="spend-form"
				method="post"
				action="?/create"
				class="bg-card space-y-3 rounded-lg border p-3 sm:p-4"
			>
				<div class="grid gap-1.5">
					<Label for="spend-amount">Amount (Rp)</Label>
					<Input
						id="spend-amount"
						name="amount"
						inputmode="numeric"
						placeholder="15000"
						required
						autocomplete="off"
					/>
				</div>

				<div class="grid gap-1.5">
					<Label for="spend-date">Date</Label>
					<Input id="spend-date" name="occurred_at" type="date" value={data.today} required />
				</div>

				<div class="grid gap-1.5">
					<Label for="spend-category">Category</Label>
					<Input
						id="spend-category"
						name="category"
						placeholder="food, transport, etc."
						list="spend-categories"
						autocomplete="off"
					/>
				</div>

				<div class="grid gap-1.5">
					<Label for="spend-merchant">Merchant (optional)</Label>
					<Input
						id="spend-merchant"
						name="merchant"
						placeholder="Canteen, GoRide, etc."
						autocomplete="off"
					/>
				</div>

				<div class="grid gap-1.5">
					<Label for="spend-note">Note (optional)</Label>
					<Input id="spend-note" name="note" autocomplete="off" />
				</div>

				<datalist id="spend-categories">
					{#each data.categories as c (c)}
						<option value={c}></option>
					{/each}
				</datalist>

				<Button class="w-full" type="submit">Save</Button>

				{#if form && 'error' in form && form.error}
					<p role="alert" class="text-destructive text-sm">{form.error}</p>
				{/if}
			</form>
		</section>
	</aside>

	<!-- Main: daftar -->
	<section class="order-1 min-w-0 space-y-4 lg:order-2">
		<!-- Tren -->
		<section aria-labelledby="spend-trend-heading" class="space-y-2">
			<h2 id="spend-trend-heading" class="label-mono px-1">Trends</h2>
			<div class="grid gap-3 sm:grid-cols-2">
				<SpendChart data={data.daily} today={data.today} />
				<MonthlySpendChart data={data.monthly} currentMonth={data.filters.month} />
			</div>
		</section>

		<!-- Toolbar: navigasi bulan + pencarian jadi satu tempat, tepat di atas
		     daftar — supaya menjangkau pengeluaran bulan lalu tidak perlu
		     bolak-balik ke sidebar. -->
		<form
			method="get"
			role="search"
			class="bg-card flex flex-col gap-2 rounded-lg border p-2 sm:flex-row sm:flex-wrap sm:items-center"
		>
			{#if data.filters.category}<input
					type="hidden"
					name="category"
					value={data.filters.category}
				/>{/if}

			<div class="flex items-center gap-1">
				<Button
					variant="ghost"
					size="icon-sm"
					class="tap-target"
					href="/spends?{buildQuery({ month: prevMonthLabel(data.filters.month) })}"
					aria-label="Previous month"
				>
					<ChevronLeft />
				</Button>
				<label for="spend-month" class="sr-only">Select month</label>
				<Input
					id="spend-month"
					class="h-8 w-[10rem]"
					type="month"
					name="month"
					value={data.filters.month}
					onchange={(e) => (e.currentTarget as HTMLInputElement).form?.requestSubmit()}
				/>
				<Button
					variant="ghost"
					size="icon-sm"
					class="tap-target"
					href="/spends?{buildQuery({ month: nextMonthLabel(data.filters.month) })}"
					aria-label="Next month"
				>
					<ChevronRight />
				</Button>
				{#if data.filters.month !== currentMonth}
					<Button variant="ghost" size="sm" href="/spends?{buildQuery({ month: currentMonth })}">
						Today
					</Button>
				{/if}
			</div>

			<div class="flex w-full min-w-0 flex-1 gap-2">
				<label for="spend-search" class="sr-only">Search spending</label>
				<Input
					id="spend-search"
					class="min-w-0 flex-1"
					name="q"
					value={data.filters.q ?? ''}
					placeholder="Search merchant, note, category…"
					autocomplete="off"
					enterkeyhint="search"
				/>
				<Button type="submit"><Search />Search</Button>
				{#if data.filters.q}
					<Button variant="ghost" href="/spends?{buildQuery({ q: undefined })}">Reset</Button>
				{/if}
			</div>
		</form>

		{#if data.filters.category}
			<div class="text-muted-foreground -mt-2 flex items-center gap-2 px-1 text-sm">
				Category filter: <Badge variant="secondary">{data.filters.category}</Badge>
				<a
					class="text-primary underline-offset-4 hover:underline"
					href="/spends?{buildQuery({ category: undefined })}">clear</a
				>
			</div>
		{/if}

		{#if data.spends.length === 0}
			<p class="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
				No {data.filters.q ? 'matching spending' : 'spending this month'} yet.
			</p>
		{:else}
			<!-- Mobile: kartu -->
			<ul class="space-y-2 md:hidden" role="list">
				{#each data.spends as s (s.id)}
					<li>
						<a
							href="/spends/{s.id}"
							class="bg-card active:bg-accent block rounded-lg border p-3 transition-colors"
						>
							<div class="flex items-start justify-between gap-2">
								<div class="min-w-0 flex-1">
									<div class="truncate text-sm font-medium">
										{s.merchant ?? s.note ?? '(no merchant)'}
									</div>
									<div
										class="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs"
									>
										{#if s.category}
											<Badge variant="secondary">{s.category}</Badge>
										{/if}
										<time>{shortDate(s.occurredAt)}</time>
										{#if s.method}<span>· {s.method}</span>{/if}
									</div>
								</div>
								<div class="shrink-0 text-right font-semibold tabular-nums">
									{formatRupiah(s.amount)}
								</div>
							</div>
						</a>
					</li>
				{/each}
			</ul>

			<!-- Desktop: tabel -->
			<div class="bg-card hidden overflow-hidden rounded-lg border md:block">
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head class="w-24">Date</Table.Head>
							<Table.Head>Merchant / Note</Table.Head>
							<Table.Head class="w-32">Category</Table.Head>
							<Table.Head class="w-24">Method</Table.Head>
							<Table.Head class="w-32 text-right">Amount</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each data.spends as s (s.id)}
							<Table.Row class="cursor-pointer" onclick={() => (location.href = `/spends/${s.id}`)}>
								<Table.Cell class="text-muted-foreground text-xs whitespace-nowrap">
									{shortDate(s.occurredAt)}
								</Table.Cell>
								<Table.Cell class="max-w-0">
									<a href="/spends/{s.id}" class="block truncate font-medium">
										{s.merchant ?? s.note ?? '(no merchant)'}
									</a>
									{#if s.merchant && s.note}
										<div class="text-muted-foreground truncate text-xs">{s.note}</div>
									{/if}
								</Table.Cell>
								<Table.Cell>
									{#if s.category}
										<Badge variant="secondary">{s.category}</Badge>
									{/if}
								</Table.Cell>
								<Table.Cell class="text-muted-foreground text-xs">{s.method ?? '—'}</Table.Cell>
								<Table.Cell class="text-right font-semibold tabular-nums">
									{formatRupiah(s.amount)}
								</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			</div>
		{/if}
	</section>
</div>

<Button
	href="#spend-form"
	size="icon-lg"
	class="fixed right-5 bottom-[calc(1.25rem+env(safe-area-inset-bottom))] z-40 size-14 rounded-full shadow-lg lg:hidden"
	aria-label="Add spending"
	title="Add spending"
>
	<Plus class="size-6" />
</Button>
