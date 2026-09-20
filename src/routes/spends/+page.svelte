<script lang="ts">
	import type { ActionData, PageData } from './$types';
	import { formatRupiah } from '$lib/format';
	import SpendChart from '$lib/components/SpendChart.svelte';
	import MonthlySpendChart from '$lib/components/MonthlySpendChart.svelte';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const [year, monthNum] = $derived(data.filters.month.split('-').map(Number));
	const monthLabel = $derived(
		new Date(year, monthNum - 1, 1).toLocaleString('id-ID', {
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
		return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
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
	<aside class="order-2 space-y-3 lg:order-1 lg:sticky lg:top-4 lg:self-start">
		<!-- Ringkasan -->
		<section
			class="rounded-box border border-base-300 bg-base-200/60 p-4"
			aria-label="Ringkasan bulan berjalan"
		>
			<h2 class="text-[10px] font-semibold uppercase tracking-wider opacity-50">Ringkasan</h2>
			<div class="mt-0.5 text-sm font-medium opacity-80">{monthLabel}</div>
			<div class="mt-2 font-display text-3xl font-semibold tabular-nums">
				{formatRupiah(data.summary.total)}
			</div>
			<div class="mt-1 flex flex-wrap gap-x-3 text-xs opacity-70">
				<span>{data.summary.count} transaksi</span>
				{#if trend !== null}
					<span class={trend > 0 ? 'text-warning' : 'text-success'}>
						{trend > 0 ? '↑' : '↓'} {Math.abs(trend)}% vs bulan lalu
					</span>
				{:else if data.summary.previousTotal === 0 && data.summary.total > 0}
					<span class="opacity-60">bulan lalu: —</span>
				{/if}
			</div>

			{#if data.summary.byCategory.length > 0}
				<div class="divider my-2"></div>
				<div class="mb-1 text-[10px] font-semibold uppercase tracking-wider opacity-50">
					Per kategori
				</div>
				<ul class="space-y-1 text-xs">
					{#each data.summary.byCategory as row}
						{@const pct = data.summary.total > 0
							? Math.round((row.total / data.summary.total) * 100)
							: 0}
						<li>
							<a
								href="/spends?{buildQuery({ category: row.category })}"
								class="flex items-center justify-between gap-2 rounded px-1 py-0.5 hover:bg-base-300"
							>
								<span class="min-w-0 truncate">{row.category}</span>
								<span class="shrink-0 tabular-nums opacity-80">
									{formatRupiah(row.total)}
									<span class="opacity-50">({pct}%)</span>
								</span>
							</a>
						</li>
					{/each}
				</ul>
			{/if}
		</section>

		<!-- Quick add -->
		<section aria-labelledby="quick-add-heading">
			<h2
				id="quick-add-heading"
				class="mb-2 px-1 text-xs font-semibold uppercase tracking-wider opacity-60"
			>
				Tambah cepat
			</h2>
			<form
				id="spend-form"
				method="post"
				action="?/create"
				class="card space-y-2 border-l-2 border-l-[--color-accent] bg-base-200 p-3 sm:p-4"
			>
				<label class="form-control w-full">
					<div class="label py-1"><span class="label-text text-xs">Jumlah (Rp)</span></div>
					<input
						class="input input-bordered w-full"
						name="amount"
						inputmode="numeric"
						placeholder="15000"
						required
						autocomplete="off"
					/>
				</label>

				<label class="form-control w-full">
					<div class="label py-1"><span class="label-text text-xs">Tanggal</span></div>
					<input
						class="input input-bordered w-full"
						name="occurred_at"
						type="date"
						value={data.today}
						required
					/>
				</label>

				<label class="form-control w-full">
					<div class="label py-1"><span class="label-text text-xs">Kategori</span></div>
					<input
						class="input input-bordered w-full"
						name="category"
						placeholder="makan, transport, dsb."
						list="spend-categories"
						autocomplete="off"
					/>
				</label>

				<label class="form-control w-full">
					<div class="label py-1"><span class="label-text text-xs">Merchant (opsional)</span></div>
					<input
						class="input input-bordered w-full"
						name="merchant"
						placeholder="Kantin, GoRide, dsb."
						autocomplete="off"
					/>
				</label>

				<label class="form-control w-full">
					<div class="label py-1"><span class="label-text text-xs">Catatan (opsional)</span></div>
					<input class="input input-bordered w-full" name="note" autocomplete="off" />
				</label>

				<datalist id="spend-categories">
					{#each data.categories as c}
						<option value={c}></option>
					{/each}
				</datalist>

				<button class="btn btn-primary w-full" type="submit">Simpan</button>

				{#if form && 'error' in form && form.error}
					<div role="alert" class="alert alert-error py-2 text-sm">{form.error}</div>
				{/if}
			</form>
		</section>
	</aside>

	<!-- Main: daftar -->
	<section class="order-1 min-w-0 space-y-4 lg:order-2">
		<header class="px-1">
			<h1 class="text-lg font-semibold sm:text-xl">Pengeluaran</h1>
		</header>

		<!-- Tren -->
		<section aria-labelledby="spend-trend-heading">
			<h2
				id="spend-trend-heading"
				class="mb-2 px-1 text-[10px] font-semibold uppercase tracking-wider opacity-50"
			>
				Tren
			</h2>
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
			class="flex flex-col gap-2 rounded-box border border-base-300 bg-base-200/40 p-2 sm:flex-row sm:flex-wrap sm:items-center"
		>
			{#if data.filters.category}<input type="hidden" name="category" value={data.filters.category} />{/if}

			<div class="flex items-center gap-1">
				<a
					class="btn btn-ghost btn-sm tap-target"
					href="/spends?{buildQuery({ month: prevMonthLabel(data.filters.month) })}"
					aria-label="Bulan sebelumnya"
				>
					←
				</a>
				<label for="spend-month" class="sr-only">Pilih bulan</label>
				<input
					id="spend-month"
					class="input input-bordered input-sm w-[9.5rem]"
					type="month"
					name="month"
					value={data.filters.month}
					onchange={(e) => e.currentTarget.form?.requestSubmit()}
				/>
				<a
					class="btn btn-ghost btn-sm tap-target"
					href="/spends?{buildQuery({ month: nextMonthLabel(data.filters.month) })}"
					aria-label="Bulan berikutnya"
				>
					→
				</a>
				{#if data.filters.month !== currentMonth}
					<a class="btn btn-ghost btn-sm" href="/spends?{buildQuery({ month: currentMonth })}">
						Hari ini
					</a>
				{/if}
			</div>

			<div class="flex w-full min-w-0 flex-1 gap-2">
				<label for="spend-search" class="sr-only">Cari pengeluaran</label>
				<input
					id="spend-search"
					class="input input-bordered w-full min-w-0 flex-1"
					name="q"
					value={data.filters.q ?? ''}
					placeholder="Cari merchant, catatan, kategori…"
					autocomplete="off"
					enterkeyhint="search"
				/>
				<button class="btn btn-primary" type="submit">Cari</button>
				{#if data.filters.q}
					<a class="btn btn-ghost" href="/spends?{buildQuery({ q: undefined })}"> Reset </a>
				{/if}
			</div>
		</form>

		{#if data.filters.category}
			<div class="-mt-2 px-1 text-sm opacity-70">
				Filter kategori: <span class="badge badge-neutral">{data.filters.category}</span>
				<a class="link ml-2" href="/spends?{buildQuery({ category: undefined })}">bersihkan</a>
			</div>
		{/if}

		{#if data.spends.length === 0}
			<p
				class="rounded-box border border-dashed border-base-300 p-6 text-center text-sm opacity-60"
			>
				Belum ada pengeluaran{data.filters.q ? ' yang cocok' : ' bulan ini'}.
			</p>
		{:else}
			<!-- Mobile: kartu -->
			<ul class="space-y-2 md:hidden" role="list">
				{#each data.spends as s (s.id)}
					<li>
						<a
							href="/spends/{s.id}"
							class="block rounded-box border border-base-300 bg-base-200/40 p-3 transition active:bg-base-300"
						>
							<div class="flex items-start justify-between gap-2">
								<div class="min-w-0 flex-1">
									<div class="truncate text-sm font-medium">
										{s.merchant ?? s.note ?? '(tanpa merchant)'}
									</div>
									<div class="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs opacity-70">
										{#if s.category}
											<span class="badge badge-ghost badge-sm">{s.category}</span>
										{/if}
										<time>{shortDate(s.occurredAt)}</time>
										{#if s.method}<span class="opacity-60">· {s.method}</span>{/if}
									</div>
								</div>
								<div class="shrink-0 text-right">
									<div class="font-semibold tabular-nums">{formatRupiah(s.amount)}</div>
								</div>
							</div>
						</a>
					</li>
				{/each}
			</ul>

			<!-- Desktop: tabel -->
			<div class="hidden overflow-x-auto rounded-box border border-base-300 md:block">
				<table class="table table-sm">
					<thead>
						<tr class="text-xs uppercase tracking-wider">
							<th class="w-24">Tanggal</th>
							<th>Merchant / Catatan</th>
							<th class="w-32">Kategori</th>
							<th class="w-24">Metode</th>
							<th class="w-32 text-right">Jumlah</th>
						</tr>
					</thead>
					<tbody>
						{#each data.spends as s (s.id)}
							<tr class="cursor-pointer hover" onclick={() => (location.href = `/spends/${s.id}`)}>
								<td class="whitespace-nowrap text-xs opacity-70">{shortDate(s.occurredAt)}</td>
								<td class="max-w-0">
									<div class="truncate font-medium">
										{s.merchant ?? s.note ?? '(tanpa merchant)'}
									</div>
									{#if s.merchant && s.note}
										<div class="truncate text-xs opacity-60">{s.note}</div>
									{/if}
								</td>
								<td>
									{#if s.category}
										<span class="badge badge-ghost badge-sm">{s.category}</span>
									{/if}
								</td>
								<td class="text-xs opacity-70">{s.method ?? '—'}</td>
								<td class="text-right font-semibold tabular-nums">{formatRupiah(s.amount)}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</section>
</div>

<a
	href="#spend-form"
	class="btn btn-primary btn-circle btn-lg fixed bottom-5 right-5 z-40 shadow-lg lg:hidden"
	aria-label="Tambah pengeluaran"
	title="Tambah pengeluaran"
	style="padding-bottom: env(safe-area-inset-bottom);"
>
	<span class="text-2xl leading-none">+</span>
</a>
