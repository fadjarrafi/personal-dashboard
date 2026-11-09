<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ItemRow } from '$lib/server/items';
	import { LANGUAGES } from '$lib/languages';
	import CodeBlock from './CodeBlock.svelte';
	import MermaidDiagram from './MermaidDiagram.svelte';
	import ConfirmAction from './ConfirmAction.svelte';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Checkbox } from '$lib/components/ui/checkbox/index.js';
	import { NativeSelect } from '$lib/components/ui/native-select/index.js';
	import Star from '@lucide/svelte/icons/star';
	import Copy from '@lucide/svelte/icons/copy';
	import Check from '@lucide/svelte/icons/check';
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import Archive from '@lucide/svelte/icons/archive';
	import Pencil from '@lucide/svelte/icons/pencil';

	let {
		item,
		tags = [],
		onClose
	}: { item: ItemRow | null; tags?: string[]; onClose: () => void } = $props();

	let copied = $state(false);
	let editing = $state(false);
	let saving = $state(false);

	const open = $derived(item !== null);

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

	const dotClass = {
		bookmark: 'text-cat-bookmark',
		note: 'text-cat-note',
		snippet: 'text-cat-snippet'
	} as const;
</script>

<Dialog.Root
	{open}
	onOpenChange={(v) => {
		if (!v) handleClose();
	}}
>
	<Dialog.Content
		class="max-h-[92vh] w-full overflow-y-auto sm:max-w-3xl"
		style="padding-bottom: calc(1.5rem + env(safe-area-inset-bottom));"
	>
		{#if item}
			<Dialog.Header class="min-w-0 pr-8 text-left">
				<div class="flex items-center gap-2">
					<Badge variant="outline" class="capitalize">
						<span class="cat-dot {dotClass[item.type]}" aria-hidden="true"></span>{item.type}
					</Badge>
					{#if item.pinned}<Star
							class="text-primary size-4 fill-current"
							aria-label="Pinned"
						/>{/if}
				</div>
				{#if item.title}
					<Dialog.Title class="text-lg break-words">{item.title}</Dialog.Title>
				{:else}
					<Dialog.Title class="sr-only">Item detail</Dialog.Title>
				{/if}
				{#if item.url}
					<a
						href={item.url}
						target="_blank"
						rel="noopener noreferrer"
						class="text-primary text-sm break-all underline-offset-4 hover:underline"
					>
						{#if item.type === 'bookmark' && item.faviconUrl}
							<img
								src={item.faviconUrl}
								alt=""
								class="inline-block h-4 w-4 align-text-bottom"
								onerror={(e) => ((e.currentTarget as HTMLImageElement).style.display = 'none')}
							/>
						{/if}
						{item.url}
					</a>
				{/if}
			</Dialog.Header>

			{#if !editing}
				<div class="min-w-0 space-y-4">
					{#if item.type === 'bookmark' && item.previewImageUrl}
						<img
							src={item.previewImageUrl}
							alt=""
							class="max-h-56 w-full rounded-md object-cover"
							onerror={(e) => ((e.currentTarget as HTMLImageElement).style.display = 'none')}
						/>
					{/if}

					{#if item.body}
						{#if item.type === 'snippet' && item.language === 'mermaid'}
							<MermaidDiagram code={item.body} maxHeight="24rem" />
						{:else if item.type === 'snippet'}
							<CodeBlock code={item.body} lang={item.language} maxHeight="24rem" />
						{:else}
							<div class="bg-well rounded-md border p-4 text-sm">
								<p class="break-words whitespace-pre-wrap">{item.body}</p>
							</div>
						{/if}
					{/if}

					{#if item.language}
						<div class="text-muted-foreground text-xs">
							Language: <span class="text-foreground">{item.language}</span>
						</div>
					{/if}

					{#if item.tags.length > 0}
						<div class="flex flex-wrap gap-1">
							{#each item.tags as tag (tag)}
								<Badge variant="outline" href="/?tag={encodeURIComponent(tag)}">#{tag}</Badge>
							{/each}
						</div>
					{/if}

					<div class="text-muted-foreground flex flex-wrap gap-x-6 gap-y-1 text-xs">
						<span>Created: {item.createdAt.slice(0, 16).replace('T', ' ')}</span>
						<span>Updated: {item.updatedAt.slice(0, 16).replace('T', ' ')}</span>
					</div>
				</div>

				<Dialog.Footer
					class="flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between"
				>
					<div class="flex flex-wrap gap-2">
						{#if item.body}
							<Button variant="outline" size="sm" onclick={copyBody}>
								{#if copied}<Check />Copied{:else}<Copy />Copy content{/if}
							</Button>
						{/if}
						{#if item.type === 'bookmark' && item.url}
							<Button
								variant="outline"
								size="sm"
								href={item.url}
								target="_blank"
								rel="noopener noreferrer"
							>
								<ExternalLink />Open
							</Button>
						{/if}
					</div>

					<div class="flex flex-wrap gap-2">
						<ConfirmAction
							action="/?/archive"
							fields={{ id: item.id }}
							title="Archive this item?"
							description="It moves to Archive, where you can restore or delete it."
							confirmLabel="Archive"
							variant="ghost"
							size="sm"
						>
							<Archive />Archive
						</ConfirmAction>
						<Button size="sm" onclick={() => (editing = true)}><Pencil />Edit</Button>
					</div>
				</Dialog.Footer>
			{:else}
				<!-- Edit di tempat, tanpa pindah halaman - form POST ke action route
				     "/" (dashboard) via use:enhance, jadi tidak reload penuh dan
				     filter/scroll/search yang sedang aktif di balik modal tetap ada. -->
				<form
					method="post"
					action="/?/update"
					class="min-w-0 space-y-4"
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

					<div class="grid gap-1.5">
						<Label for="edit-title">Title</Label>
						<Input id="edit-title" name="title" value={item.title ?? ''} />
					</div>

					{#if item.type === 'bookmark'}
						<div class="grid gap-1.5">
							<Label for="edit-url">URL</Label>
							<Input id="edit-url" type="url" name="url" value={item.url ?? ''} />
						</div>
					{/if}

					{#if item.type === 'snippet'}
						<div class="grid gap-1.5">
							<Label for="edit-language">Language</Label>
							<NativeSelect
								id="edit-language"
								class="w-full"
								name="language"
								value={item.language ?? ''}
							>
								<option value="">— choose language (optional) —</option>
								{#each LANGUAGES as lang (lang)}
									<option value={lang}>{lang}</option>
								{/each}
							</NativeSelect>
						</div>
					{/if}

					<div class="grid gap-1.5">
						<Label for="edit-body">Content</Label>
						<Textarea
							id="edit-body"
							class={item.type === 'snippet' ? 'bg-well font-mono' : ''}
							name="body"
							rows={8}
							value={item.body ?? ''}
						/>
					</div>

					<div class="grid gap-1.5">
						<Label for="edit-tags">Tags (comma-separated)</Label>
						<Input
							id="edit-tags"
							name="tags"
							value={item.tags.join(', ')}
							list="modal-known-tags"
						/>
						<datalist id="modal-known-tags">
							{#each tags as t (t)}
								<option value={t}></option>
							{/each}
						</datalist>
					</div>

					<div class="flex items-center gap-2">
						<Checkbox id="edit-pinned" name="pinned" checked={!!item.pinned} />
						<Label for="edit-pinned" class="text-sm font-normal">Pin to top</Label>
					</div>

					<Dialog.Footer class="flex-col-reverse gap-2 sm:flex-row sm:justify-end">
						<Button variant="ghost" disabled={saving} onclick={() => (editing = false)}>
							Cancel
						</Button>
						<Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
					</Dialog.Footer>
				</form>
			{/if}
		{/if}
	</Dialog.Content>
</Dialog.Root>
