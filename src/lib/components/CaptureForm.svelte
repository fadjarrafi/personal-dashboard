<script lang="ts">
	import { enhance } from '$app/forms';
	import { LANGUAGES } from '$lib/languages';

	let { tags = [] }: { tags?: string[] } = $props();

	type CaptureType = 'note' | 'bookmark' | 'snippet';
	let type = $state<CaptureType>('note');
	let form: HTMLFormElement | undefined;
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

	async function autofillTitle(input: HTMLInputElement) {
		const url = input.value.trim();
		if (!url || !/^https?:\/\//i.test(url)) return;
		try {
			const res = await fetch('/api/bookmarks/fetch-title', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ url })
			});
			if (!res.ok) return;
			const { title } = await res.json();
			const titleInput = form?.querySelector<HTMLInputElement>('input[name="title"]');
			if (titleInput && !titleInput.value && title) titleInput.value = title;
		} catch {
			// best-effort; abaikan
		}
	}
</script>

<form
	bind:this={form}
	method="post"
	action="?/create"
	use:enhance={() => async ({ update, result }) => {
		await update({ reset: true });
		if (result.type === 'success') clearDraft();
	}}
	class="card bg-base-200 p-4"
>
	<div role="tablist" class="tabs tabs-boxed mb-3 w-fit">
		{#each ['note', 'bookmark', 'snippet'] as t}
			<button
				type="button"
				role="tab"
				class="tab {type === t ? 'tab-active' : ''}"
				onclick={() => (type = t as typeof type)}
			>
				{t}
			</button>
		{/each}
	</div>
	<input type="hidden" name="type" value={type} />

	{#if type === 'bookmark'}
		<input
			class="input input-bordered mb-2 w-full"
			name="url"
			type="url"
			placeholder="https://…"
			required
			onblur={(e) => autofillTitle(e.currentTarget)}
		/>
		<input class="input input-bordered mb-2 w-full" name="title" placeholder="Judul (auto bila kosong)" />
		<textarea
			class="textarea textarea-bordered mb-2 w-full"
			name="body"
			rows="2"
			placeholder="Catatan opsional"
		></textarea>
	{:else if type === 'snippet'}
		<input
			class="input input-bordered mb-2 w-full"
			name="title"
			placeholder="Judul snippet"
		/>
		<select class="select select-bordered mb-2 w-full" name="language">
			<option value="">— pilih bahasa (opsional) —</option>
			{#each LANGUAGES as lang}
				<option value={lang}>{lang}</option>
			{/each}
		</select>
		<textarea
			class="textarea textarea-bordered mb-2 w-full font-mono"
			name="body"
			rows="5"
			placeholder="Tempel kode di sini…"
			required
		></textarea>
	{:else}
		<textarea
			class="textarea textarea-bordered mb-2 w-full"
			name="body"
			rows="3"
			placeholder="Tulis fleeting note… (draft tersimpan otomatis)"
			required
			autofocus
			bind:value={noteBody}
		></textarea>
	{/if}

	<div class="join w-full">
		<input
			class="input input-bordered join-item flex-1"
			name="tags"
			placeholder="tag1, tag2 (opsional)"
			list="known-tags"
		/>
		<button class="btn btn-primary join-item" type="submit">Simpan</button>
	</div>

	<datalist id="known-tags">
		{#each tags as t}
			<option value={t}></option>
		{/each}
	</datalist>
</form>
