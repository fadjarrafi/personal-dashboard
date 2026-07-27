<script lang="ts">
	import type { ItemRow } from '$lib/server/items';
	import CodeBlock from './CodeBlock.svelte';

	let { item, onClose }: { item: ItemRow | null; onClose: () => void } = $props();

	let dialog: HTMLDialogElement | undefined;
	let copied = $state(false);

	$effect(() => {
		if (!dialog) return;
		if (item) {
			if (!dialog.open) dialog.showModal();
		} else if (dialog.open) {
			dialog.close();
		}
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
	<div class="modal-box max-h-[92vh] w-full max-w-3xl safe-bottom">
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

			<div class="modal-action flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
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
					<a class="btn btn-sm btn-primary" href="/items/{item.id}">Edit</a>
				</div>
			</div>
		{/if}
	</div>
	<form method="dialog" class="modal-backdrop">
		<button aria-label="Tutup">close</button>
	</form>
</dialog>
