<script lang="ts">
	import { enhance } from '$app/forms';
	import { LANGUAGES } from '$lib/languages';
	import * as Tabs from '$lib/components/ui/tabs/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { NativeSelect } from '$lib/components/ui/native-select/index.js';
	import { Button } from '$lib/components/ui/button/index.js';

	let { tags = [] }: { tags?: string[] } = $props();

	type CaptureType = 'note' | 'bookmark' | 'snippet';
	let type = $state<CaptureType>('note');
	let form: HTMLFormElement | undefined;
	let faviconInput: HTMLInputElement | undefined = $state();
	let previewImageInput: HTMLInputElement | undefined = $state();
	let noteBody = $state('');
	let draftRestored = $state(false);

	const DRAFT_KEY = 'dashboard:draft:note';

	$effect(() => {
		if (typeof localStorage === 'undefined') return;
		if (type !== 'note' || draftRestored) return;
		const saved = localStorage.getItem(DRAFT_KEY) ?? '';
		if (saved) noteBody = saved;
		draftRestored = true;
	});

	let saveTimer: ReturnType<typeof setTimeout> | undefined;
	$effect(() => {
		if (typeof localStorage === 'undefined') return;
		if (type !== 'note') return;
		const current = noteBody;
		if (saveTimer) clearTimeout(saveTimer);
		saveTimer = setTimeout(() => {
			if (current.trim().length === 0) localStorage.removeItem(DRAFT_KEY);
			else localStorage.setItem(DRAFT_KEY, current);
		}, 300);
	});

	function clearDraft() {
		noteBody = '';
		if (typeof localStorage !== 'undefined') localStorage.removeItem(DRAFT_KEY);
	}

	async function autofillMeta(input: HTMLInputElement) {
		const url = input.value.trim();
		if (!url || !/^https?:\/\//i.test(url)) return;
		try {
			const res = await fetch('/api/bookmarks/fetch-meta', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ url })
			});
			if (!res.ok) return;
			const { title, faviconUrl, previewImageUrl } = await res.json();
			const titleInput = form?.querySelector<HTMLInputElement>('input[name="title"]');
			if (titleInput && !titleInput.value && title) titleInput.value = title;
			// faviconUrl/previewImageUrl tak punya UI sendiri (selalu auto) - timpa
			// tanpa syarat, termasuk mengosongkan, supaya ganti URL tak menyisakan
			// gambar dari URL sebelumnya.
			if (faviconInput) faviconInput.value = faviconUrl ?? '';
			if (previewImageInput) previewImageInput.value = previewImageUrl ?? '';
		} catch {
			// best-effort; abaikan
		}
	}
</script>

<form
	id="capture-form"
	bind:this={form}
	method="post"
	action="?/create"
	use:enhance={() =>
		async ({ update, result }) => {
			await update({ reset: true });
			if (result.type === 'success') clearDraft();
		}}
	class="bg-card flex flex-col gap-2 rounded-lg border p-3 sm:p-4 lg:min-h-0 lg:flex-1"
>
	<Tabs.Root bind:value={type} class="mb-1">
		<Tabs.List aria-label="Entry type" class="w-full sm:w-fit">
			{#each ['note', 'bookmark', 'snippet'] as t (t)}
				<Tabs.Trigger value={t} class="capitalize">{t}</Tabs.Trigger>
			{/each}
		</Tabs.List>
	</Tabs.Root>
	<input type="hidden" name="type" value={type} />

	{#if type === 'bookmark'}
		<Input
			name="url"
			type="url"
			placeholder="https://…"
			aria-label="URL"
			required
			onblur={(e) => autofillMeta(e.currentTarget as HTMLInputElement)}
		/>
		<Input name="title" placeholder="Title (auto-filled if empty)" aria-label="Title" />
		<input type="hidden" name="faviconUrl" bind:this={faviconInput} />
		<input type="hidden" name="previewImageUrl" bind:this={previewImageInput} />
		<Textarea
			class="lg:min-h-24 lg:flex-1 lg:resize-none"
			name="body"
			rows={2}
			placeholder="Optional note"
			aria-label="Note"
		/>
	{:else if type === 'snippet'}
		<Input name="title" placeholder="Snippet title" aria-label="Snippet title" />
		<NativeSelect name="language" class="w-full" aria-label="Language">
			<option value="">— choose language (optional) —</option>
			{#each LANGUAGES as lang (lang)}
				<option value={lang}>{lang}</option>
			{/each}
		</NativeSelect>
		<Textarea
			class="bg-well font-mono lg:min-h-24 lg:flex-1 lg:resize-none"
			name="body"
			rows={5}
			placeholder="Paste code here…"
			aria-label="Code"
			required
		/>
	{:else}
		<!-- svelte-ignore a11y_autofocus -->
		<Textarea
			class="lg:min-h-24 lg:flex-1 lg:resize-none"
			name="body"
			rows={3}
			placeholder="Write a fleeting note… (draft auto-saved)"
			aria-label="Note"
			required
			autofocus
			bind:value={noteBody}
		/>
	{/if}

	<div class="flex w-full flex-wrap gap-2 sm:flex-nowrap">
		<label for="capture-tags" class="sr-only">Tag</label>
		<Input
			id="capture-tags"
			class="min-w-0 flex-1"
			name="tags"
			placeholder="tag1, tag2 (optional)"
			list="known-tags"
		/>
		<Button class="w-full sm:w-auto" type="submit">Save</Button>
	</div>

	<datalist id="known-tags">
		{#each tags as t (t)}
			<option value={t}></option>
		{/each}
	</datalist>
</form>
