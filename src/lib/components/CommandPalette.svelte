<script lang="ts">
	import { goto } from '$app/navigation';
	import { navSections } from '$lib/nav';
	import { tools } from '$lib/tools';

	type ItemHit = {
		id: number;
		type: 'bookmark' | 'note' | 'snippet';
		title: string | null;
		url: string | null;
		language: string | null;
		body: string | null;
	};

	type Entry = {
		key: string;
		group: string;
		label: string;
		hint?: string;
		haystack: string;
		run: (alt: boolean) => void | Promise<void>;
	};

	const TYPE_LABEL = { bookmark: 'Bookmark', note: 'Note', snippet: 'Snippet' } as const;

	const staticEntries: Entry[] = [
		...navSections.flatMap((s) =>
			s.links.map((l) => ({
				key: `nav:${l.href}`,
				group: 'Halaman',
				label: l.label,
				hint: s.title,
				haystack: `${l.label} ${s.title}`.toLowerCase(),
				run: () => go(l.href, l.href === '/export')
			}))
		),
		...tools.map((t) => ({
			key: `tool:${t.slug}`,
			group: 'Dev Tools',
			label: t.label,
			hint: t.description,
			haystack: `${t.label} ${t.keywords.join(' ')} tool`.toLowerCase(),
			run: () => go(`/tools/${t.slug}`)
		}))
	];

	let dialog: HTMLDialogElement;
	let input = $state<HTMLInputElement>();
	let isOpen = $state(false);
	let query = $state('');
	let hits = $state<ItemHit[]>([]);
	let loading = $state(false);
	let active = $state(0);
	let toast = $state<string | null>(null);
	let returnFocus: HTMLElement | null = null;

	export function open() {
		if (isOpen) return;
		returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
		query = '';
		hits = [];
		active = 0;
		isOpen = true;
		dialog.showModal();
		queueMicrotask(() => input?.focus());
	}

	function close() {
		dialog.close();
	}

	function onClose() {
		isOpen = false;
		returnFocus?.focus();
	}

	function go(href: string, hardNav = false) {
		close();
		if (hardNav) window.location.href = href;
		else goto(href);
	}

	async function copy(text: string) {
		try {
			await navigator.clipboard.writeText(text);
			toast = 'Snippet tersalin';
			setTimeout(() => (toast = null), 1200);
		} catch {
			// ignore
		}
	}

	// Cocok jika semua kata kueri muncul (substring) di haystack.
	function matches(haystack: string, q: string) {
		return q.split(/\s+/).every((w) => haystack.includes(w));
	}

	const itemEntries = $derived(
		hits.map(
			(h): Entry => ({
				key: `item:${h.id}`,
				group: 'Item',
				label: h.title || h.url || (h.body ?? '').slice(0, 60) || `#${h.id}`,
				hint:
					h.type === 'snippet'
						? `${TYPE_LABEL[h.type]}${h.language ? ` · ${h.language}` : ''} · Shift+Enter copy`
						: h.type === 'bookmark'
							? `${TYPE_LABEL[h.type]} · Shift+Enter buka link`
							: TYPE_LABEL[h.type],
				haystack: '',
				run: (alt) => {
					if (alt && h.type === 'snippet' && h.body) {
						copy(h.body);
						close();
					} else if (alt && h.type === 'bookmark' && h.url) {
						window.open(h.url, '_blank', 'noopener');
						close();
					} else {
						go(`/items/${h.id}`);
					}
				}
			})
		)
	);

	const entries = $derived.by(() => {
		const q = query.trim().toLowerCase();
		const staticHits = q ? staticEntries.filter((e) => matches(e.haystack, q)) : staticEntries;
		return [...staticHits, ...itemEntries];
	});

	// Reset seleksi saat kueri berubah.
	$effect(() => {
		void query;
		active = 0;
	});

	// Cari item di server (debounce + batalkan request lama).
	$effect(() => {
		const q = query.trim();
		if (q.length < 2) {
			hits = [];
			loading = false;
			return;
		}
		const ctrl = new AbortController();
		const t = setTimeout(async () => {
			loading = true;
			try {
				const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
				if (res.ok) hits = ((await res.json()) as { items: ItemHit[] }).items;
			} catch {
				// dibatalkan / offline
			} finally {
				if (!ctrl.signal.aborted) loading = false;
			}
		}, 150);
		return () => {
			clearTimeout(t);
			ctrl.abort();
		};
	});

	function scrollActiveIntoView() {
		queueMicrotask(() =>
			document.getElementById(`cmdk-opt-${active}`)?.scrollIntoView({ block: 'nearest' })
		);
	}

	function onInputKeydown(e: KeyboardEvent) {
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			active = entries.length ? (active + 1) % entries.length : 0;
			scrollActiveIntoView();
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			active = entries.length ? (active - 1 + entries.length) % entries.length : 0;
			scrollActiveIntoView();
		} else if (e.key === 'Enter') {
			e.preventDefault();
			entries[active]?.run(e.shiftKey);
		}
	}

	function onWindowKeydown(e: KeyboardEvent) {
		if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 'k') {
			e.preventDefault();
			if (isOpen) close();
			else open();
		}
	}
</script>

<svelte:window onkeydown={onWindowKeydown} />

<dialog
	bind:this={dialog}
	class="modal modal-top sm:modal-middle"
	onclose={onClose}
	aria-label="Command palette"
>
	<div class="modal-box flex max-h-[80vh] max-w-xl flex-col rounded-none border border-base-300 p-0">
		<div class="flex items-center gap-2 border-b border-base-300 px-3">
			<span aria-hidden="true" class="opacity-50">⌕</span>
			<input
				bind:this={input}
				bind:value={query}
				onkeydown={onInputKeydown}
				class="input input-ghost w-full rounded-none px-0 focus:outline-none"
				placeholder="Cari halaman, tool, atau item…"
				role="combobox"
				aria-expanded="true"
				aria-controls="cmdk-list"
				aria-activedescendant={entries.length ? `cmdk-opt-${active}` : undefined}
				aria-autocomplete="list"
				autocomplete="off"
				spellcheck="false"
			/>
			{#if loading}<span class="loading loading-spinner loading-xs"></span>{/if}
			<kbd class="kbd kbd-xs hidden sm:inline-flex">Esc</kbd>
		</div>

		<ul id="cmdk-list" role="listbox" class="flex-1 overflow-y-auto py-1" aria-label="Hasil">
			{#each entries as entry, i (entry.key)}
				{#if i === 0 || entries[i - 1].group !== entry.group}
					<li role="presentation" class="label-mono px-3 pb-1 pt-2">{entry.group}</li>
				{/if}
				<li
					id="cmdk-opt-{i}"
					role="option"
					aria-selected={i === active}
					class="flex cursor-pointer items-baseline justify-between gap-3 px-3 py-2 text-sm {i ===
					active
						? 'bg-base-300'
						: ''}"
					onmousemove={() => (active = i)}
					onclick={(e) => entry.run(e.shiftKey)}
					onkeydown={() => {}}
				>
					<span class="truncate">{entry.label}</span>
					{#if entry.hint}<span class="shrink-0 truncate text-xs opacity-50">{entry.hint}</span>{/if}
				</li>
			{:else}
				<li class="px-3 py-6 text-center text-sm opacity-60">
					{loading ? 'Mencari…' : 'Tidak ada hasil'}
				</li>
			{/each}
		</ul>

		<div
			class="hidden gap-3 border-t border-base-300 px-3 py-1.5 text-[11px] opacity-60 sm:flex"
			aria-hidden="true"
		>
			<span><kbd class="kbd kbd-xs">↑↓</kbd> pilih</span>
			<span><kbd class="kbd kbd-xs">Enter</kbd> buka</span>
			<span><kbd class="kbd kbd-xs">Shift Enter</kbd> copy snippet / buka link</span>
		</div>
	</div>
	<form method="dialog" class="modal-backdrop">
		<button aria-label="Tutup">close</button>
	</form>
</dialog>

{#if toast}
	<div class="toast toast-center z-[60]" role="status">
		<div class="alert rounded-none py-2 text-sm">{toast}</div>
	</div>
{/if}
