<script lang="ts">
	import { goto } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Kbd } from '$lib/components/ui/kbd/index.js';
	import { Spinner } from '$lib/components/ui/spinner/index.js';
	import SearchIcon from '@lucide/svelte/icons/search';
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
				group: 'Pages',
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

	let input = $state<HTMLInputElement>();
	let isOpen = $state(false);
	let query = $state('');
	let hits = $state<ItemHit[]>([]);
	let loading = $state(false);
	let active = $state(0);
	let returnFocus: HTMLElement | null = null;

	export function open() {
		if (isOpen) return;
		returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
		query = '';
		hits = [];
		active = 0;
		isOpen = true;
	}

	function close() {
		isOpen = false;
	}

	function onOpenChange(v: boolean) {
		if (!v) returnFocus?.focus();
	}

	// Focus the search field once the portalled dialog content is mounted;
	// bits-ui's own auto-focus fires before `input` is bound.
	$effect(() => {
		if (!isOpen || !input) return;
		const el = input;
		const t = setTimeout(() => el.focus(), 0);
		return () => clearTimeout(t);
	});

	function go(href: string, hardNav = false) {
		close();
		if (hardNav) window.location.href = href;
		else goto(href);
	}

	async function copy(text: string) {
		try {
			await navigator.clipboard.writeText(text);
			toast.success('Snippet copied');
		} catch {
			// ignore
		}
	}

	// Cocok jika semua kata kueri muncul (substring) di haystack.
	function matches(haystack: string, q: string) {
		return q.split(/\s+/).every((w) => haystack.includes(w));
	}

	const itemEntries = $derived(
		hits.map((h): Entry => ({
			key: `item:${h.id}`,
			group: 'Item',
			label: h.title || h.url || (h.body ?? '').slice(0, 60) || `#${h.id}`,
			hint:
				h.type === 'snippet'
					? `${TYPE_LABEL[h.type]}${h.language ? ` · ${h.language}` : ''} · Shift+Enter copy`
					: h.type === 'bookmark'
						? `${TYPE_LABEL[h.type]} · Shift+Enter open link`
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
		}))
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

<Dialog.Root bind:open={isOpen} {onOpenChange}>
	<Dialog.Content
		class="top-[12vh] flex max-h-[76vh] translate-y-0 flex-col gap-0 overflow-hidden p-0 sm:max-w-xl"
		showCloseButton={false}
		aria-label="Command palette"
		onOpenAutoFocus={(e) => {
			e.preventDefault();
			input?.focus();
		}}
	>
		<Dialog.Title class="sr-only">Command palette</Dialog.Title>
		<div class="flex items-center gap-2 border-b px-3">
			<SearchIcon class="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
			<input
				bind:this={input}
				bind:value={query}
				onkeydown={onInputKeydown}
				class="placeholder:text-muted-foreground h-12 w-full bg-transparent text-sm outline-none focus-visible:outline-none"
				placeholder="Search pages, tools, or items…"
				role="combobox"
				aria-expanded="true"
				aria-controls="cmdk-list"
				aria-activedescendant={entries.length ? `cmdk-opt-${active}` : undefined}
				aria-autocomplete="list"
				autocomplete="off"
				spellcheck="false"
			/>
			{#if loading}<Spinner class="text-muted-foreground" />{/if}
			<Kbd class="hidden sm:inline-flex">Esc</Kbd>
		</div>

		<ul
			id="cmdk-list"
			role="listbox"
			class="flex-1 overflow-x-hidden overflow-y-auto p-1"
			aria-label="Results"
		>
			{#each entries as entry, i (entry.key)}
				{#if i === 0 || entries[i - 1].group !== entry.group}
					<li role="presentation" class="label-mono px-2 pt-2 pb-1">{entry.group}</li>
				{/if}
				<li
					id="cmdk-opt-{i}"
					role="option"
					aria-selected={i === active}
					class="flex cursor-pointer items-baseline justify-between gap-3 rounded-md px-2 py-2 text-sm {i ===
					active
						? 'bg-accent text-accent-foreground'
						: ''}"
					onmousemove={() => (active = i)}
					onclick={(e) => entry.run(e.shiftKey)}
					onkeydown={() => {}}
				>
					<span class="truncate">{entry.label}</span>
					{#if entry.hint}
						<span class="text-muted-foreground shrink-0 truncate text-xs">{entry.hint}</span>
					{/if}
				</li>
			{:else}
				<li class="text-muted-foreground px-3 py-6 text-center text-sm">
					{loading ? 'Searching…' : 'No results'}
				</li>
			{/each}
		</ul>

		<div
			class="text-muted-foreground hidden gap-3 border-t px-3 py-2 text-[11px] sm:flex"
			aria-hidden="true"
		>
			<span><Kbd>↑↓</Kbd> select</span>
			<span><Kbd>Enter</Kbd> open</span>
			<span><Kbd>Shift Enter</Kbd> copy snippet / open link</span>
		</div>
	</Dialog.Content>
</Dialog.Root>
