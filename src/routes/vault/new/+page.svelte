<script lang="ts">
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
</script>

<svelte:head>
	<title>New note · Vault</title>
</svelte:head>

<div class="mx-auto max-w-xl">
	<a class="btn btn-ghost btn-sm mb-3" href="/vault">← Vault</a>
	<h1 class="mb-3 font-display text-xl font-semibold">New note</h1>

	{#if form && 'error' in form && form.error}
		<div role="alert" class="alert alert-error mb-3 text-sm">{form.error}</div>
	{/if}

	<form method="post" class="space-y-3">
		<div>
			<label class="label" for="title"><span class="label-text">Title</span></label>
			<input
				id="title"
				name="title"
				type="text"
				class="input input-bordered w-full"
				required
				autofocus
			/>
		</div>
		<div>
			<label class="label" for="body"><span class="label-text">Content</span></label>
			<textarea id="body" name="body" rows="8" class="textarea textarea-bordered w-full"></textarea>
		</div>
		<div>
			<label class="label" for="tags"><span class="label-text">Tags (comma-separated)</span></label>
			<input id="tags" name="tags" type="text" class="input input-bordered w-full" />
		</div>
		<button class="btn btn-primary" type="submit">Save to vault</button>
	</form>
	<p class="mt-3 text-xs opacity-50">
		Written to <code>Dashboard Sync/</code> then pushed to Google Drive - it will appear in Obsidian
		after the next sync.
	</p>
</div>
