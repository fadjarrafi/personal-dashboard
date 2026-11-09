<script lang="ts">
	import type { ActionData, PageData } from './$types';
	import { formatRupiah } from '$lib/format';
	import * as Alert from '$lib/components/ui/alert/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
	import ScanText from '@lucide/svelte/icons/scan-text';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const receiptSrc = $derived(`/receipts/${data.receipt.id}`);
	const hint = $derived(data.extracted?.hint);
	const suggested = $derived({
		amount: data.extracted?.amount ?? null,
		merchant: data.extracted?.merchant ?? hint?.title ?? '',
		category: data.extracted?.category ?? '',
		occurredAt: data.extracted?.occurredAt ? data.extracted.occurredAt.slice(0, 10) : data.today,
		method: data.extracted?.method ?? '',
		refId: data.extracted?.refId ?? '',
		note: hint?.text ?? ''
	});
</script>

<div class="mx-auto max-w-3xl space-y-4">
	<div class="flex flex-wrap items-center justify-between gap-2">
		<h1 class="text-lg font-semibold sm:text-xl">Preview receipt</h1>
		<Button variant="ghost" size="sm" class="tap-target" href="/spends">Cancel</Button>
	</div>

	<div class="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
		<!-- Gambar receipt -->
		<figure class="bg-well rounded-lg border p-2" aria-label="Shared receipt image">
			<img
				src={receiptSrc}
				alt="Shared receipt"
				class="mx-auto max-h-[70vh] w-auto rounded-md object-contain"
				loading="eager"
			/>
			<figcaption class="text-muted-foreground mt-2 text-center text-[11px]">
				Receipt #{data.receipt.id} · {new Date(data.receipt.createdAt).toLocaleString('en-GB')}
			</figcaption>
		</figure>

		<!-- Form preview -->
		<form method="post" action="?/create" class="space-y-4">
			{#if suggested.amount === null && suggested.merchant === ''}
				<Alert.Root class="border-warning/40 text-warning">
					<TriangleAlert />
					<Alert.Description class="text-warning">
						OCR could not find an amount — please fill it in from the image.
					</Alert.Description>
				</Alert.Root>
			{:else}
				<Alert.Root>
					<ScanText />
					<Alert.Description>
						Auto-filled by OCR. Check &amp; correct if needed before saving.
					</Alert.Description>
				</Alert.Root>
			{/if}

			<div class="grid gap-1.5">
				<Label for="amount">Amount (Rp)</Label>
				<Input
					id="amount"
					class="text-lg font-semibold tabular-nums"
					name="amount"
					inputmode="numeric"
					value={suggested.amount ?? ''}
					placeholder="15000"
					required
				/>
			</div>

			<div class="grid gap-1.5">
				<Label for="occurred_at">Date</Label>
				<Input
					id="occurred_at"
					name="occurred_at"
					type="date"
					value={suggested.occurredAt}
					required
				/>
			</div>

			<div class="grid gap-1.5">
				<Label for="merchant">Merchant</Label>
				<Input
					id="merchant"
					name="merchant"
					value={suggested.merchant}
					placeholder="Canteen, GoRide, etc."
				/>
			</div>

			<div class="grid gap-1.5">
				<Label for="category">Category</Label>
				<Input
					id="category"
					name="category"
					value={suggested.category}
					list="share-categories"
					placeholder="food, transport, etc."
				/>
				<datalist id="share-categories">
					{#each data.categories as c (c)}
						<option value={c}></option>
					{/each}
				</datalist>
			</div>

			<div class="grid gap-1.5">
				<Label for="method">Method</Label>
				<Input
					id="method"
					name="method"
					value={suggested.method}
					placeholder="gopay, blu, jago, livin, etc."
				/>
			</div>

			<div class="grid gap-1.5">
				<Label for="note">Note</Label>
				<Input id="note" name="note" value={suggested.note} />
			</div>

			<input type="hidden" name="ref_id" value={suggested.refId} />

			{#if form?.error}
				<p role="alert" class="text-destructive text-sm">{form.error}</p>
			{/if}

			<div class="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
				<Button variant="ghost" class="flex-1 sm:flex-none" href="/spends">Cancel</Button>
				<Button class="flex-1 sm:flex-none" type="submit">
					Save{#if suggested.amount}
						{' '}{formatRupiah(suggested.amount)}
					{/if}
				</Button>
			</div>
		</form>
	</div>
</div>
