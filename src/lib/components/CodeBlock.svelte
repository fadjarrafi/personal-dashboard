<script lang="ts">
	import { toHljsLang } from '$lib/languages';
	import { Button } from '$lib/components/ui/button/index.js';
	import Copy from '@lucide/svelte/icons/copy';
	import Check from '@lucide/svelte/icons/check';

	let {
		code,
		lang = null,
		maxHeight = '24rem'
	}: {
		code: string;
		lang?: string | null;
		maxHeight?: string;
	} = $props();

	let html = $state<string>('');
	let ready = $state(false);
	let copied = $state(false);

	$effect(() => {
		let cancelled = false;
		(async () => {
			const { default: hljs } = await import('highlight.js/lib/common');
			if (cancelled) return;
			const target = toHljsLang(lang);
			try {
				if (target !== 'plaintext' && hljs.getLanguage(target)) {
					html = hljs.highlight(code, { language: target, ignoreIllegals: true }).value;
				} else {
					html = hljs.highlightAuto(code).value;
				}
			} catch {
				html = escapeHtml(code);
			}
			ready = true;
		})();
		return () => {
			cancelled = true;
		};
	});

	function escapeHtml(s: string) {
		return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
	}

	async function copyCode() {
		try {
			await navigator.clipboard.writeText(code);
			copied = true;
			setTimeout(() => (copied = false), 1200);
		} catch {
			// ignore
		}
	}
</script>

<div class="overflow-hidden rounded-md border">
	<div class="bg-card flex items-center justify-between border-b px-3 py-1">
		<span class="label-mono">{lang ?? 'plaintext'}</span>
		<Button variant="ghost" size="xs" onclick={copyCode} aria-label="Copy code">
			{#if copied}<Check />Copied{:else}<Copy />Copy{/if}
		</Button>
	</div>
	<pre
		class="hljs-mono bg-well overflow-auto p-3 text-xs leading-relaxed"
		style="max-height: {maxHeight}"><code
			>{#if ready}<!-- eslint-disable-next-line svelte/no-at-html-tags -->{@html html}{:else}{code}{/if}</code
		></pre>
</div>
