<script lang="ts">
	import type { ActionData, PageData } from './$types';
	import { formatRupiah } from '$lib/format';
	import NotificationSetup from '$lib/components/NotificationSetup.svelte';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let recurrence = $state('monthly');

	const categoryLabels: Record<string, string> = {
		listrik: 'Listrik',
		internet: 'Internet',
		cicilan: 'Cicilan',
		langganan: 'Langganan',
		kartu_kredit: 'Kartu Kredit',
		lainnya: 'Lainnya'
	};
	const recurrenceLabels: Record<string, string> = {
		none: 'Sekali',
		monthly: 'Bulanan',
		weekly: 'Mingguan',
		custom_days: 'Interval hari'
	};
	const statusLabels: Record<string, string> = {
		overdue: 'Lewat jatuh tempo',
		due_soon: 'Segera jatuh tempo',
		upcoming: 'Akan datang'
	};
	const statusBadgeClass: Record<string, string> = {
		overdue: 'badge-error',
		due_soon: 'badge-warning',
		upcoming: 'badge-ghost'
	};

	function shortDate(iso: string): string {
		return new Date(iso).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
	}

	function dueLabel(days: number): string {
		if (days < 0) return `Telat ${Math.abs(days)} hari`;
		if (days === 0) return 'Jatuh tempo hari ini';
		return `${days} hari lagi`;
	}
</script>

<div class="grid gap-4 sm:gap-6 lg:grid-cols-[380px_1fr]">
	<aside class="order-2 space-y-3 lg:order-1 lg:sticky lg:top-4 lg:self-start">
		<section
			class="rounded-box border border-base-300 bg-base-200/60 p-4"
			aria-label="Notifikasi tagihan"
		>
			<h2 class="text-[10px] font-semibold uppercase tracking-wider opacity-50">Notifikasi</h2>
			<div class="mt-2">
				<NotificationSetup deviceCount={data.devices.length} />
			</div>
		</section>

		<section aria-labelledby="bill-add-heading">
			<h2
				id="bill-add-heading"
				class="mb-2 px-1 text-xs font-semibold uppercase tracking-wider opacity-60"
			>
				Tambah tagihan
			</h2>
			<form
				method="post"
				action="?/create"
				class="card space-y-2 border-l-2 border-l-[--color-accent] bg-base-200 p-3 sm:p-4"
			>
				<label class="form-control w-full">
					<div class="label py-1"><span class="label-text text-xs">Nama tagihan</span></div>
					<input
						class="input input-bordered w-full"
						name="title"
						placeholder="Listrik PLN, Internet, dsb."
						required
						autocomplete="off"
					/>
				</label>

				<label class="form-control w-full">
					<div class="label py-1"><span class="label-text text-xs">Jumlah (Rp)</span></div>
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
					<div class="label py-1"><span class="label-text text-xs">Jatuh tempo</span></div>
					<input class="input input-bordered w-full" name="next_due_at" type="date" required />
				</label>

				<label class="form-control w-full">
					<div class="label py-1"><span class="label-text text-xs">Kategori</span></div>
					<select class="select select-bordered w-full" name="category">
						{#each data.categories as c}
							<option value={c}>{categoryLabels[c]}</option>
						{/each}
					</select>
				</label>

				<label class="form-control w-full">
					<div class="label py-1"><span class="label-text text-xs">Pengulangan</span></div>
					<select class="select select-bordered w-full" name="recurrence" bind:value={recurrence}>
						{#each data.recurrences as r}
							<option value={r}>{recurrenceLabels[r]}</option>
						{/each}
					</select>
				</label>

				{#if recurrence === 'custom_days'}
					<label class="form-control w-full">
						<div class="label py-1"><span class="label-text text-xs">Interval (hari)</span></div>
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

				<button class="btn btn-primary w-full" type="submit">Simpan</button>

				{#if form && 'error' in form && form.error}
					<div role="alert" class="alert alert-error py-2 text-sm">{form.error}</div>
				{/if}
			</form>
		</section>
	</aside>

	<section class="order-1 min-w-0 space-y-3 lg:order-2">
		<header class="px-1">
			<h1 class="text-lg font-semibold sm:text-xl">Tagihan</h1>
		</header>

		{#if data.bills.length === 0}
			<p class="rounded-box border border-dashed border-base-300 p-6 text-center text-sm opacity-60">
				Belum ada tagihan tercatat.
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
								<button class="btn btn-success btn-sm tap-target" type="submit">Tandai lunas</button>
							</form>
						</div>
					</li>
				{/each}
			</ul>
		{/if}
	</section>
</div>
