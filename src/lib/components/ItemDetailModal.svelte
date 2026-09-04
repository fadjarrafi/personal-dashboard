<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ItemRow } from '$lib/server/items';
	import { LANGUAGES } from '$lib/languages';
	import CodeBlock from './CodeBlock.svelte';

	let {
		item,
		tags = [],
		onClose
	}: { item: ItemRow | null; tags?: string[]; onClose: () => void } = $props();

	let dialog: HTMLDialogElement | undefined;
	let copied = $state(false);
	let editing = $state(false);
	let saving = $state(false);

	$effect(() => {
		if (!dialog) return;
		if (item) {
			if (!dialog.open) dialog.showModal();
		} else if (dialog.open) {
			dialog.close();
		}
	});

	// Reset ke mode lihat setiap kali item berganti / modal ditutup, supaya
	// modal tidak "nyangkut" di mode edit saat dibuka lagi untuk item lain.
	$effect(() => {
		item;
		editing = false;
	});

	function handleClose() {
		copied = false;
		onClose();
	}

	async function copyBody() {
		if (!item?.body) return;
		try {
			await navigator.clipboard.writeText(item.body);
			copied = true;
			setTimeout(() => (copied = false), 1200);
		} catch {
			// ignore
		}
	}

	const badgeClass = {
		bookmark: 'badge-success',
		note: 'badge-warning',
		snippet: 'badge-info'
	} as const;
</script>

<dialog bind:this={dialog} class="modal modal-bottom sm:modal-middle" onclose={handleClose}>
	<div
		class="modal-box max-h-[92vh] w-full max-w-3xl"
		style="padding-bottom: calc(1.5rem + env(safe-area-inset-bottom));"
	>
		{#if item}
			<header class="mb-4 flex items-start justify-between gap-2">
				<div class="min-w-0">
					<div class="mb-1 flex items-center gap-2">
						<span class="badge {badgeClass[item.type]} badge-sm font-mono">{item.type}</span>
						{#if item.pinned}<span class="text-warning">★</span>{/if}
					</div>
					{#if item.title}
						<h3 class="text-lg font-semibold break-words">{item.title}</h3>
					{/if}
					{#if item.url}
						<a
							href={item.url}
							target="_blank"
							rel="noopener noreferrer"
							class="link link-primary break-all text-sm"
						>
							{item.url}
						</a>
					{/if}
				</div>
				<form method="dialog">
					<button class="btn btn-ghost btn-sm btn-circle" aria-label="Tutup">✕</button>
				</form>
			</header>

			{#if !editing}
				{#if item.body}
					<div class="mb-4">
						{#if item.type === 'snippet'}
							<CodeBlock code={item.body} lang={item.language} maxHeight="24rem" />
						{:else}
							<div class="rounded-box bg-base-200 p-4 text-sm">
								<p class="whitespace-pre-wrap break-words">{item.body}</p>
							</div>
						{/if}
					</div>
				{/if}

				{#if item.language}
					<div class="mb-3 text-xs opacity-70">
						Bahasa: <span class="font-mono">{item.language}</span>
					</div>
				{/if}

				{#if item.tags.length > 0}
					<div class="mb-4 flex flex-wrap gap-1">
						{#each item.tags as tag}
							<a
								class="badge badge-outline hover:badge-neutral"
								href="/?tag={encodeURIComponent(tag)}"
							>
								#{tag}
							</a>
						{/each}
					</div>
				{/if}

				<div class="mb-4 flex flex-wrap gap-x-6 gap-y-1 text-xs opacity-60">
					<span>Dibuat: {item.createdAt.slice(0, 16).replace('T', ' ')}</span>
					<span>Diperbarui: {item.updatedAt.slice(0, 16).replace('T', ' ')}</span>
				</div>

				<div
					class="modal-action flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between"
				>
					<div class="flex flex-wrap gap-2">
						{#if item.body}
							<button type="button" class="btn btn-sm" onclick={copyBody}>
								{copied ? '✓ Tersalin' : 'Copy isi'}
							</button>
						{/if}
						{#if item.type === 'bookmark' && item.url}
							<a class="btn btn-sm" href={item.url} target="_blank" rel="noopener noreferrer">
								Buka ↗
							</a>
						{/if}
					</div>

					<div class="flex flex-wrap gap-2">
						<form method="post" action="/?/archive">
							<input type="hidden" name="id" value={item.id} />
							<button
								class="btn btn-sm btn-ghost"
								type="submit"
								onclick={(e) => {
									if (!confirm('Arsipkan item ini?')) e.preventDefault();
								}}
							>
								Arsipkan
							</button>
						</form>
						<button type="button" class="btn btn-sm btn-primary" onclick={() => (editing = true)}>
							Edit
						</button>
					</div>
				</div>
			{:else}
				<!-- Edit di tempat, tanpa pindah halaman - form POST ke action route
				     "/" (dashboard) via use:enhance, jadi tidak reload penuh dan
				     filter/scroll/search yang sedang aktif di balik modal tetap ada. -->
				<form
					method="post"
					action="/?/update"
					class="space-y-3"
					use:enhance={() => {
						saving = true;
						return async ({ update, result }) => {
							await update();
							saving = false;
							if (result.type === 'success') onClose();
						};
					}}
				>
					<input type="hidden" name="id" value={item.id} />

					<label class="form-control w-full">
						<div class="label py-1"><span class="label-text text-xs">Judul</span></div>
						<input class="input input-bordered w-full" name="title" value={item.title ?? ''} />
					</label>

					{#if item.type === 'bookmark'}
						<label class="form-control w-full">
							<div class="label py-1"><span class="label-text text-xs">URL</span></div>
							<input
								class="input input-bordered w-full"
								type="url"
								name="url"
								value={item.url ?? ''}
							/>
						</label>
					{/if}

					{#if item.type === 'snippet'}
						<label class="form-control w-full">
							<div class="label py-1"><span class="label-text text-xs">Bahasa</span></div>
							<select
								class="select select-bordered w-full"
								name="language"
								value={item.language ?? ''}
							>
								<option value="">— pilih bahasa (opsional) —</option>
								{#each LANGUAGES as lang}
									<option value={lang}>{lang}</option>
								{/each}
							</select>
						</label>
					{/if}

					<label class="form-control w-full">
						<div class="label py-1"><span class="label-text text-xs">Isi</span></div>
						<textarea
							class="textarea textarea-bordered w-full {item.type === 'snippet'
								? 'font-mono'
								: ''}"
							name="body"
							rows="8">{item.body ?? ''}</textarea
						>
					</label>

					<label class="form-control w-full">
						<div class="label py-1"><span class="label-text text-xs">Tag (pisah dengan koma)</span></div>
						<input
							class="input input-bordered w-full"
							name="tags"
							value={item.tags.join(', ')}
							list="modal-known-tags"
						/>
						<datalist id="modal-known-tags">
							{#each tags as t}
								<option value={t}></option>
							{/each}
						</datalist>
					</label>

					<label class="label cursor-pointer justify-start gap-2 py-1">
						<input
							type="checkbox"
							name="pinned"
							class="checkbox checkbox-primary checkbox-sm"
							checked={!!item.pinned}
						/>
						<span class="label-text text-xs">Pin ke atas</span>
					</label>

					<div class="modal-action flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
						<button
							type="button"
							class="btn btn-ghost"
							disabled={saving}
							onclick={() => (editing = false)}
						>
							Batal
						</button>
						<button class="btn btn-primary" type="submit" disabled={saving}>
							{saving ? 'Menyimpan…' : 'Simpan'}
						</button>
					</div>
				</form>
			{/if}
		{/if}
	</div>
	<form method="dialog" class="modal-backdrop">
		<button aria-label="Tutup">close</button>
	</form>
</dialog>
