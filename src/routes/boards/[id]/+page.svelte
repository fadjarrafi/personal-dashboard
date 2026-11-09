<script lang="ts">
	import '@excalidraw/excalidraw/index.css';
	import ConfirmAction from '$lib/components/ConfirmAction.svelte';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import Archive from '@lucide/svelte/icons/archive';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import { onMount, onDestroy } from 'svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let container: HTMLDivElement;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let root: any;
	let saveTimer: ReturnType<typeof setTimeout> | undefined;
	let saveState: 'idle' | 'saving' | 'saved' = $state('idle');

	async function saveScene(sceneJson: string) {
		saveState = 'saving';
		try {
			await fetch(`/boards/${data.board.id}/scene`, {
				method: 'PATCH',
				headers: { 'content-type': 'application/json' },
				body: sceneJson
			});
			saveState = 'saved';
		} catch {
			saveState = 'idle';
		}
	}

	function scheduleSave(sceneJson: string) {
		if (saveTimer) clearTimeout(saveTimer);
		saveTimer = setTimeout(() => saveScene(sceneJson), 1500);
	}

	onMount(() => {
		let cancelled = false;

		(async () => {
			const [React, { createRoot }, Excalidraw] = await Promise.all([
				import('react'),
				import('react-dom/client'),
				import('@excalidraw/excalidraw')
			]);
			if (cancelled) return;

			const initialParsed = JSON.parse(data.scene ?? '{}');
			const restored = Excalidraw.restore(initialParsed, null, null);

			root = createRoot(container);
			root.render(
				React.createElement(Excalidraw.Excalidraw, {
					initialData: restored,
					theme: 'dark',
					onChange: ((elements: never, appState: never, files: never) => {
						const json = Excalidraw.serializeAsJSON(elements, appState, files, 'local');
						scheduleSave(json);
					}) as never
				})
			);
		})();

		return () => {
			cancelled = true;
		};
	});

	onDestroy(() => {
		if (saveTimer) clearTimeout(saveTimer);
		root?.unmount();
	});
</script>

<div class="space-y-3">
	<header class="flex flex-wrap items-center justify-between gap-2 px-1">
		<div class="flex items-center gap-2">
			<Button variant="ghost" size="sm" class="-ms-2" href="/boards"><ArrowLeft />Boards</Button>
			<form method="post" action="?/rename" class="flex items-center gap-1">
				<Input
					class="h-8"
					name="title"
					value={data.board.title}
					aria-label="Board title"
					autocomplete="off"
				/>
				<Button variant="ghost" size="sm" type="submit">Save name</Button>
			</form>
		</div>
		<div class="flex items-center gap-2">
			<span class="text-muted-foreground text-xs" aria-live="polite">
				{saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? 'Saved' : ''}
			</span>
			<form method="post" action="?/archive">
				<Button variant="ghost" size="sm" class="tap-target" type="submit"
					><Archive />Archive</Button
				>
			</form>
			<ConfirmAction
				action="?/delete"
				title="Delete this board?"
				description="The board and all its contents are removed. This cannot be undone."
				confirmLabel="Delete"
				destructive
				size="sm"
				class="tap-target"
			>
				<Trash2 />Delete
			</ConfirmAction>
		</div>
	</header>

	{#if form && 'error' in form && form.error}
		<p role="alert" class="text-destructive text-sm">{form.error}</p>
	{/if}

	<div
		bind:this={container}
		class="relative w-full overflow-hidden rounded-lg border"
		style="height: 75vh;"
	></div>
</div>
