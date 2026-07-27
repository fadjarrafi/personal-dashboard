<script lang="ts">
	import type { ActionData, PageData } from './$types';
	import { formatRupiah } from '$lib/format';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	const spend = $derived(data.spend);

	const occurredDate = $derived(spend.occurredAt.slice(0, 10));
	const createdLabel = $derived(new Date(spend.createdAt).toLocaleString('id-ID'));
</script>

<div class="mx-auto max-w-2xl">
	<div class="mb-4 flex flex-wrap items-center justify-between gap-2">
		<h1 class="text-lg font-semibold sm:text-xl">Edit pengeluaran</h1>
		<a class="btn btn-ghost btn-sm tap-target" href="/spends">← Kembali</a>
	</div>

	<div class="mb-4 rounded-box border border-base-300 bg-base-200/40 p-3 text-sm">
		<div class="text-xs opacity-60">Jumlah saat ini</div>
		<div class="text-2xl font-semibold tabular-nums">{formatRupiah(spend.amount)}</div>
		<div class="mt-1 text-xs opacity-50">Dibuat: {createdLabel}</div>
	</div>

	<form method="post" action="?/update" class="space-y-3">
		<label class="form-control w-full">
			<div class="label"><span class="label-text">Jumlah (Rp)</span></div>
			<input
				class="input input-bordered w-full"
				name="amount"
				inputmode="numeric"
				value={spend.amount}
				required
			/>
		</label>

		<label class="form-control w-full">
			<div class="label"><span class="label-text">Tanggal</span></div>
			<input
				class="input input-bordered w-full"
				name="occurred_at"
				type="date"
				value={occurredDate}
				required
			/>
		</label>

		<label class="form-control w-full">
			<div class="label"><span class="label-text">Kategori</span></div>
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
			<div class="label"><span class="label-text">Catatan</span></div>
			<input class="input input-bordered w-full" name="note" value={spend.note ?? ''} />
		</label>

		<label class="form-control w-full">
			<div class="label"><span class="label-text">Metode</span></div>
			<input
				class="input input-bordered w-full"
				name="method"
				value={spend.method ?? ''}
				placeholder="gopay, blu, tunai, dsb."
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
					if (!confirm('Hapus pengeluaran ini permanen?')) e.preventDefault();
				}}
			>
				Hapus
			</button>
			<div class="flex gap-2 sm:justify-end">
				<a class="btn btn-ghost flex-1 sm:flex-none" href="/spends">Batal</a>
				<button class="btn btn-primary flex-1 sm:flex-none" type="submit">Simpan</button>
			</div>
		</div>
	</form>
</div>
