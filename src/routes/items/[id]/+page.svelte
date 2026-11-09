<script lang="ts">
	import type { PageData } from './$types';
	import ConfirmAction from '$lib/components/ConfirmAction.svelte';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Checkbox } from '$lib/components/ui/checkbox/index.js';
	import { NativeSelect } from '$lib/components/ui/native-select/index.js';
	import Archive from '@lucide/svelte/icons/archive';
	import { LANGUAGES } from '$lib/languages';

	let { data }: { data: PageData } = $props();
	const item = $derived(data.item);
</script>

<div class="mx-auto max-w-2xl space-y-4">
	<h1 class="text-lg font-semibold capitalize sm:text-xl">Edit {item.type}</h1>

	<form method="post" action="?/update" id="item-edit" class="space-y-4">
		<div class="grid gap-1.5">
			<Label for="title">Title</Label>
			<Input id="title" name="title" value={item.title ?? ''} />
		</div>

		{#if item.type === 'bookmark'}
			<div class="grid gap-1.5">
				<Label for="url">URL</Label>
				<Input id="url" type="url" name="url" value={item.url ?? ''} />
			</div>

			{#if item.faviconUrl || item.previewImageUrl}
				<div class="flex items-center gap-2">
					{#if item.faviconUrl}
						<img
							src={item.faviconUrl}
							alt=""
							class="h-5 w-5"
							onerror={(e) => ((e.currentTarget as HTMLImageElement).style.display = 'none')}
						/>
					{/if}
					{#if item.previewImageUrl}
						<img
							src={item.previewImageUrl}
							alt=""
							class="h-16 rounded-md object-cover"
							onerror={(e) => ((e.currentTarget as HTMLImageElement).style.display = 'none')}
						/>
					{/if}
				</div>
			{/if}
		{/if}

		{#if item.type === 'snippet'}
			<div class="grid gap-1.5">
				<Label for="language">Language</Label>
				<NativeSelect id="language" class="w-full" name="language" value={item.language ?? ''}>
					<option value="">— choose language (optional) —</option>
					{#each LANGUAGES as lang (lang)}
						<option value={lang}>{lang}</option>
					{/each}
				</NativeSelect>
			</div>
		{/if}

		<div class="grid gap-1.5">
			<Label for="body">Content</Label>
			<Textarea
				id="body"
				class={item.type === 'snippet' ? 'bg-well font-mono' : ''}
				name="body"
				rows={10}
				value={item.body ?? ''}
			/>
		</div>

		<div class="grid gap-1.5">
			<Label for="tags">Tags (comma-separated)</Label>
			<Input id="tags" name="tags" value={item.tags.join(', ')} list="known-tags" />
			<datalist id="known-tags">
				{#each data.tags as t (t)}
					<option value={t}></option>
				{/each}
			</datalist>
		</div>

		<div class="flex items-center gap-2">
			<Checkbox id="pinned" name="pinned" checked={!!item.pinned} />
			<Label for="pinned" class="font-normal">Pin to top</Label>
		</div>
	</form>

	<div class="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-between">
		<ConfirmAction
			action="?/archive"
			title="Archive this item?"
			description="It moves to Archive, where you can restore or delete it."
			confirmLabel="Archive"
			variant="ghost"
		>
			<Archive />Archive
		</ConfirmAction>
		<div class="flex gap-2 sm:justify-end">
			<Button variant="ghost" class="flex-1 sm:flex-none" href="/">Cancel</Button>
			<Button class="flex-1 sm:flex-none" type="submit" form="item-edit">Save</Button>
		</div>
	</div>
</div>
