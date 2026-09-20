<script lang="ts">
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let recurrence = $state(data.bill.recurrence);

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
</script>

<div class="mx-auto max-w-lg space-y-4">
	<header class="px-1">
		<a href="/bills" class="link text-sm opacity-70">← Kembali ke Tagihan</a>
		<h1 class="mt-1 text-lg font-semibold sm:text-xl">{data.bill.title}</h1>
	</header>

	<form method="post" action="?/update" class="card space-y-3 border border-base-300 bg-base-200/40 p-4">
		<label class="form-control w-full">
			<div class="label py-1"><span class="label-text text-xs">Nama tagihan</span></div>
			<input class="input input-bordered w-full" name="title" value={data.bill.title} required />
		</label>

		<label class="form-control w-full">
			<div class="label py-1"><span class="label-text text-xs">Jumlah (Rp)</span></div>
			<input
				class="input input-bordered w-full"
				name="amount"
				inputmode="numeric"
				value={data.bill.amount}
				required
			/>
		</label>

		<label class="form-control w-full">
			<div class="label py-1"><span class="label-text text-xs">Jatuh tempo</span></div>
			<input
				class="input input-bordered w-full"
				name="next_due_at"
				type="date"
				value={data.bill.nextDueAt.slice(0, 10)}
				required
			/>
		</label>

		<label class="form-control w-full">
			<div class="label py-1"><span class="label-text text-xs">Kategori</span></div>
			<select class="select select-bordered w-full" name="category" value={data.bill.category}>
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
					value={data.bill.intervalDays ?? ''}
					required
				/>
			</label>
		{/if}

		<button class="btn btn-primary w-full" type="submit">Simpan perubahan</button>

		{#if form && 'error' in form && form.error}
			<div role="alert" class="alert alert-error py-2 text-sm">{form.error}</div>
		{/if}
	</form>

	<div class="flex flex-wrap gap-2">
		<form method="post" action="?/markPaid">
			<button class="btn btn-success btn-sm tap-target" type="submit">Tandai lunas</button>
		</form>
		<form method="post" action="?/snooze">
			<button class="btn btn-outline btn-sm tap-target" type="submit">Ingatkan besok</button>
		</form>
		<form
			method="post"
			action="?/delete"
			onsubmit={(e) => {
				if (!confirm('Hapus tagihan ini?')) e.preventDefault();
			}}
		>
			<button class="btn btn-error btn-outline btn-sm tap-target" type="submit">Hapus</button>
		</form>
	</div>
</div>
