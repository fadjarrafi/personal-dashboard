<script lang="ts">
	import { onMount, onDestroy, untrack } from 'svelte';
	import GripHorizontal from '@lucide/svelte/icons/grip-horizontal';
	import Palette from '@lucide/svelte/icons/palette';
	import Bold from '@lucide/svelte/icons/bold';
	import Italic from '@lucide/svelte/icons/italic';
	import ListTodo from '@lucide/svelte/icons/list-todo';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import ConfirmAction from '$lib/components/ConfirmAction.svelte';
	import {
		STICKY_COLORS,
		STICKY_COLOR_NAMES,
		isStickyColor,
		type StickyColor
	} from '$lib/stickies';

	interface Props {
		id: number;
		content: string;
		color: string;
		onedit?: (id: number, html: string) => void;
		oncolor?: (id: number, color: StickyColor) => void;
		draggable?: boolean;
	}

	let { id, content, color: initialColor, onedit, oncolor, draggable = true }: Props = $props();

	let editor: HTMLDivElement;
	let color = $state<StickyColor>(
		untrack(() => (isStickyColor(initialColor) ? initialColor : 'blue'))
	);
	let picking = $state(false);
	let saveTimer: ReturnType<typeof setTimeout> | undefined;
	let dirty = false;

	async function patch(body: { content?: string; color?: string }, keepalive = false) {
		try {
			await fetch(`/stickies/${id}`, {
				method: 'PATCH',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(body),
				keepalive
			});
		} catch {
			/* offline: next edit retries with the full content */
		}
	}

	function html(): string {
		// Browsers leave a lone <br> after clearing the text; treat it as empty.
		if (!editor.textContent?.trim() && !editor.querySelector('input')) return '';
		return editor.innerHTML;
	}

	function flush(keepalive = false) {
		if (saveTimer) clearTimeout(saveTimer);
		saveTimer = undefined;
		if (!dirty) return;
		dirty = false;
		patch({ content: html() }, keepalive);
	}

	function changed() {
		dirty = true;
		onedit?.(id, html());
		if (saveTimer) clearTimeout(saveTimer);
		saveTimer = setTimeout(() => flush(), 600);
	}

	function format(cmd: 'bold' | 'italic') {
		editor.focus();
		document.execCommand(cmd);
		changed();
	}

	function addChecklist() {
		editor.focus();
		// Caret after existing text → start a fresh line so the checkbox gets its own row.
		if (getSelection()?.anchorNode?.textContent?.trim()) document.execCommand('insertParagraph');
		document.execCommand('insertHTML', false, '<div><input type="checkbox">&nbsp;</div>');
		changed();
	}

	function onclick(e: MouseEvent) {
		const t = e.target;
		if (t instanceof HTMLInputElement && t.type === 'checkbox') {
			// innerHTML only serialises the attribute, not the live .checked property.
			if (t.checked) t.setAttribute('checked', '');
			else t.removeAttribute('checked');
			changed();
		}
	}

	function onpaste(e: ClipboardEvent) {
		e.preventDefault();
		document.execCommand('insertText', false, e.clipboardData?.getData('text/plain') ?? '');
	}

	function setColor(c: StickyColor) {
		color = c;
		oncolor?.(id, c);
		picking = false;
		patch({ color: c });
	}

	const flushOnHide = () => flush(true);

	onMount(() => {
		editor.innerHTML = content;
		// Native listeners (run before the dnd zone's item listener): typing and text selection must never start a card drag.
		const stop = (e: Event) => e.stopPropagation();
		editor.addEventListener('mousedown', stop);
		editor.addEventListener('touchstart', stop, { passive: true });
		window.addEventListener('pagehide', flushOnHide);
	});

	onDestroy(() => {
		if (typeof window !== 'undefined') window.removeEventListener('pagehide', flushOnHide);
		flush(true);
	});
</script>

<article
	class="flex h-80 flex-col rounded-lg p-4 text-neutral-900 shadow-sm"
	style="background-color: {STICKY_COLORS[color]}"
>
	{#if draggable}
		<!-- Grip: visual affordance. The whole card except the editor is a drag surface (svelte-dnd-action). -->
		<div
			aria-hidden="true"
			class="-mt-1 mb-1 flex cursor-grab justify-center text-neutral-600 active:cursor-grabbing"
		>
			<GripHorizontal class="size-4" />
		</div>
	{/if}

	<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
	<div
		bind:this={editor}
		contenteditable="true"
		role="textbox"
		tabindex="0"
		aria-multiline="true"
		aria-label="Sticky note"
		data-placeholder="Click to type here"
		class="sticky-editor min-h-0 flex-1 overflow-y-auto text-sm leading-relaxed break-words outline-none"
		oninput={changed}
		onblur={() => flush()}
		{onclick}
		{onpaste}
	></div>

	{#if picking}
		<div class="flex items-center gap-2 pt-3" role="group" aria-label="Sticky colour">
			{#each STICKY_COLOR_NAMES as name (name)}
				<button
					type="button"
					class="size-6 rounded-full border border-black/20 focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:outline-none {name ===
					color
						? 'ring-2 ring-neutral-900'
						: ''}"
					style="background-color: {STICKY_COLORS[name]}"
					aria-label={name}
					aria-pressed={name === color}
					onclick={() => setColor(name)}
				></button>
			{/each}
		</div>
	{/if}

	<div class="flex items-center gap-1 pt-3 text-neutral-700">
		<!-- mousedown preventDefault keeps the text selection while clicking the toolbar -->
		<button
			type="button"
			class="sticky-tool"
			aria-label="Change colour"
			aria-expanded={picking}
			onclick={() => (picking = !picking)}><Palette class="size-4" /></button
		>
		<button
			type="button"
			class="sticky-tool"
			aria-label="Bold"
			onmousedown={(e) => e.preventDefault()}
			onclick={() => format('bold')}><Bold class="size-4" /></button
		>
		<button
			type="button"
			class="sticky-tool"
			aria-label="Italic"
			onmousedown={(e) => e.preventDefault()}
			onclick={() => format('italic')}><Italic class="size-4" /></button
		>
		<button
			type="button"
			class="sticky-tool"
			aria-label="Add checklist item"
			onmousedown={(e) => e.preventDefault()}
			onclick={addChecklist}><ListTodo class="size-4" /></button
		>
		<ConfirmAction
			action="?/delete"
			fields={{ id }}
			title="Delete this sticky?"
			description="The note is removed. This cannot be undone."
			confirmLabel="Delete"
			destructive
			variant="ghost"
			size="icon"
			class="sticky-tool border-transparent text-neutral-700 hover:bg-black/10 hover:text-neutral-900"
			formClass="ms-auto"
			ariaLabel="Delete sticky"
		>
			<Trash2 class="size-4" />
		</ConfirmAction>
	</div>
</article>

<style>
	.sticky-editor:empty::before {
		content: attr(data-placeholder);
		color: rgb(64 64 64 / 0.55);
		pointer-events: none;
	}
	.sticky-editor :global(input[type='checkbox']) {
		margin-inline-end: 0.25rem;
		vertical-align: middle;
		accent-color: #404040;
	}
	.sticky-tool {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 2.75rem;
		min-height: 2.75rem;
		border-radius: 0.375rem;
	}
	@media (min-width: 1024px) {
		.sticky-tool {
			min-width: 2rem;
			min-height: 2rem;
		}
	}
	.sticky-tool:hover {
		background-color: rgb(0 0 0 / 0.1);
	}
	.sticky-tool:focus-visible {
		outline: 2px solid #171717;
	}
</style>
