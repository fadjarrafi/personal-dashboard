<script lang="ts">
	import type { ActionData, PageData } from './$types';
	import { formatRupiah } from '$lib/format';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const receiptSrc = $derived(`/receipts/${data.receipt.id}`);
	const hint = $derived(data.extracted?.hint);
	const suggested = $derived({
		amount: data.extracted?.amount ?? null,
		merchant: data.extracted?.merchant ?? hint?.title ?? '',
		category: data.extracted?.category ?? '',
		occurredAt: data.extracted?.occurredAt
			? data.extracted.occurredAt.slice(0, 10)
			: data.today,
		method: data.extracted?.method ?? '',
		refId: data.extracted?.refId ?? '',
		note: hint?.text ?? ''
	});
</script>

<div class="mx-auto max-w-3xl">
	<div class="mb-4 flex flex-wrap items-center justify-between gap-2">
		<h1 class="text-lg font-semibold sm:text-xl">Preview receipt</h1>
		<a class="btn btn-ghost btn-sm tap-target" href="/spends">Batal</a>
	</div>

	<div class="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
		<!-- Gambar receipt -->
		<figure
			class="rounded-box border border-base-300 bg-base-200/40 p-2"
			aria-label="Gambar receipt yang dibagikan"
		>
			<img
				src={receiptSrc}
				alt="Receipt yang dibagikan"
				class="mx-auto max-h-[70vh] w-auto rounded-box object-contain"
				loading="eager"
			/>
			<figcaption class="mt-2 text-center text-[10px] opacity-50">
				Receipt #{data.receipt.id} · {new Date(data.receipt.createdAt).toLocaleString('id-ID')}
			</figcaption>
		</figure>

		<!-- Form preview -->
		<form method="post" action="?/create" class="space-y-3">
			{#if suggested.amount === null && suggested.merchant === ''}
				<div class="alert alert-warning py-2 text-sm">
					<span>OCR tidak menemukan jumlah — silakan isi manual dari gambar.</span>
				</div>
			{:else}
				<div class="alert alert-info py-2 text-xs">
					<span>Terisi otomatis oleh OCR. Periksa &amp; koreksi bila perlu sebelum simpan.</span>
				</div>
			{/if}

			<label class="form-control w-full">
				<div class="label py-1"><span class="label-text">Jumlah (Rp)</span></div>
				<input
					class="input input-bordered w-full text-lg font-semibold tabular-nums"
					name="amount"
					inputmode="numeric"
					value={suggested.amount ?? ''}
					placeholder="15000"
					required
				/>
			</label>

			<label class="form-control w-full">
				<div class="label py-1"><span class="label-text">Tanggal</span></div>
				<input
					class="input input-bordered w-full"
					name="occurred_at"
					type="date"
					value={suggested.occurredAt}
					required
				/>
			</label>

			<label class="form-control w-full">
				<div class="label py-1"><span class="label-text">Merchant</span></div>
				<input
					class="input input-bordered w-full"
					name="merchant"
					value={suggested.merchant}
					placeholder="Kantin, GoRide, dsb."
				/>
			</label>

			<label class="form-control w-full">
				<div class="label py-1"><span class="label-text">Kategori</span></div>
				<input
					class="input input-bordered w-full"
					name="category"
					value={suggested.category}
					list="share-categories"
					placeholder="makan, transport, dsb."
				/>
				<datalist id="share-categories">
					{#each data.categories as c}
						<option value={c}></option>
					{/each}
				</datalist>
			</label>

			<label class="form-control w-full">
				<div class="label py-1"><span class="label-text">Metode</span></div>
				<input
					class="input input-bordered w-full"
					name="method"
					value={suggested.method}
					placeholder="gopay, blu, jago, livin, dsb."
				/>
			</label>

			<label class="form-control w-full">
				<div class="label py-1"><span class="label-text">Catatan</span></div>
				<input class="input input-bordered w-full" name="note" value={suggested.note} />
			</label>

			<input type="hidden" name="ref_id" value={suggested.refId} />

			{#if form?.error}
				<div role="alert" class="alert alert-error py-2 text-sm">{form.error}</div>
			{/if}

			<div class="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
				<a class="btn btn-ghost flex-1 sm:flex-none" href="/spends">Batal</a>
				<button class="btn btn-primary flex-1 sm:flex-none" type="submit">
					Simpan{#if suggested.amount}
						{' '}{formatRupiah(suggested.amount)}
					{/if}
				</button>
			</div>
		</form>
	</div>
</div>
