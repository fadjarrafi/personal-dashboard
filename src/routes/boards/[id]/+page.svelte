<script lang="ts">
	import '@excalidraw/excalidraw/index.css';
	import ConfirmAction from '$lib/components/ConfirmAction.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import Archive from '@lucide/svelte/icons/archive';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import { onMount, onDestroy } from 'svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let container: HTMLDivElement;
	let titleInput: HTMLInputElement;
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

<div class="flex min-h-0 flex-1 flex-col">
	<header class="bg-background flex h-11 shrink-0 items-center justify-between gap-2 border-b px-3">
		<nav class="flex min-w-0 items-center gap-1 text-sm" aria-label="Breadcrumb">
			<a href="/boards" class="text-muted-foreground hover:text-foreground shrink-0">Boards</a>
			<ChevronRight class="text-muted-foreground size-4 shrink-0" />
			<form method="post" action="?/rename" class="min-w-0">
				<input
					bind:this={titleInput}
					class="focus-visible:ring-ring hover:bg-muted w-full max-w-64 min-w-24 truncate rounded bg-transparent px-1.5 py-0.5 font-medium outline-none focus-visible:ring-2"
					name="title"
					value={data.board.title}
					aria-label="Board title"
					autocomplete="off"
					onchange={() => titleInput.form?.requestSubmit()}
				/>
			</form>
		</nav>
		<div class="flex shrink-0 items-center gap-1">
			<span class="text-muted-foreground me-1 text-xs" aria-live="polite">
				{saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? 'Saved' : ''}
			</span>
			<form method="post" action="?/archive">
				<Button variant="ghost" size="sm" class="tap-target lg:min-h-0" type="submit"
					><Archive /><span class="hidden sm:inline">Archive</span></Button
				>
			</form>
			<ConfirmAction
				action="?/delete"
				title="Delete this board?"
				description="The board and all its contents are removed. This cannot be undone."
				confirmLabel="Delete"
				destructive
				size="sm"
				class="tap-target lg:min-h-0"
			>
				<Trash2 /><span class="hidden sm:inline">Delete</span>
			</ConfirmAction>
		</div>
	</header>

	{#if form && 'error' in form && form.error}
		<p role="alert" class="text-destructive px-3 py-1 text-sm">{form.error}</p>
	{/if}

	<!-- Full-bleed canvas: Excalidraw supplies the menu, toolbar, library, zoom and help chrome. -->
	<div class="relative min-h-[420px] flex-1">
		<div bind:this={container} class="absolute inset-0"></div>
	</div>
</div>
