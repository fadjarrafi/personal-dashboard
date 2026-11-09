<script lang="ts">
	import type { ActionData } from './$types';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';

	let { form }: { form: ActionData } = $props();
</script>

<svelte:head>
	<title>New note · Vault</title>
</svelte:head>

<div class="mx-auto max-w-xl space-y-4">
	<div class="space-y-1">
		<Button variant="ghost" size="sm" class="-ms-2" href="/vault"><ArrowLeft />Vault</Button>
		<h1 class="text-xl font-semibold">New note</h1>
	</div>

	{#if form && 'error' in form && form.error}
		<p role="alert" class="text-destructive text-sm">{form.error}</p>
	{/if}

	<form method="post" class="space-y-4">
		<div class="grid gap-1.5">
			<Label for="title">Title</Label>
			<!-- svelte-ignore a11y_autofocus -->
			<Input id="title" name="title" type="text" required autofocus />
		</div>
		<div class="grid gap-1.5">
			<Label for="body">Content</Label>
			<Textarea id="body" name="body" rows={8} />
		</div>
		<div class="grid gap-1.5">
			<Label for="tags">Tags (comma-separated)</Label>
			<Input id="tags" name="tags" type="text" />
		</div>
		<Button type="submit">Save to vault</Button>
	</form>
	<p class="text-muted-foreground text-xs">
		Written to <code class="text-foreground">Dashboard Sync/</code> then pushed to Google Drive - it will
		appear in Obsidian after the next sync.
	</p>
</div>
