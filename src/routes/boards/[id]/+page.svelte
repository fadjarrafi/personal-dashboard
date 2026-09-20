<script lang="ts">
	import '@excalidraw/excalidraw/index.css';
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
			<a href="/boards" class="link text-sm opacity-70">← Board</a>
			<form method="post" action="?/rename" class="flex items-center gap-1">
				<input
					class="input input-bordered input-sm"
					name="title"
					value={data.board.title}
					autocomplete="off"
				/>
				<button class="btn btn-ghost btn-sm" type="submit">Simpan nama</button>
			</form>
		</div>
		<div class="flex items-center gap-2">
			<span class="text-xs opacity-50">
				{saveState === 'saving' ? 'Menyimpan…' : saveState === 'saved' ? 'Tersimpan' : ''}
			</span>
			<form method="post" action="?/archive">
				<button class="btn btn-ghost btn-sm tap-target" type="submit">Arsipkan</button>
			</form>
			<form
				method="post"
				action="?/delete"
				onsubmit={(e) => {
					if (!confirm('Hapus board ini beserta isinya?')) e.preventDefault();
				}}
			>
				<button class="btn btn-error btn-outline btn-sm tap-target" type="submit">Hapus</button>
			</form>
		</div>
	</header>

	{#if form && 'error' in form && form.error}
		<div role="alert" class="alert alert-error py-2 text-sm">{form.error}</div>
	{/if}

	<div bind:this={container} class="relative w-full overflow-hidden rounded-box border border-base-300" style="height: 75vh;"></div>
</div>
