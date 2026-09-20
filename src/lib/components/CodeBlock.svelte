<script lang="ts">
	import { toHljsLang } from '$lib/languages';

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
		return s
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;');
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

<div class="border border-base-300">
	<div class="flex items-center justify-between border-b border-base-300 bg-base-200 px-3 py-1.5">
		<span class="label-mono">{lang ?? 'plaintext'}</span>
		<button type="button" class="btn btn-ghost btn-xs rounded-none" onclick={copyCode}>
			{copied ? 'Tersalin' : 'Copy'}
		</button>
	</div>
	<pre
		class="hljs-mono overflow-auto bg-black p-3 text-xs leading-relaxed"
		style="max-height: {maxHeight}"><code
			>{#if ready}<!-- eslint-disable-next-line svelte/no-at-html-tags -->{@html html}{:else}{code}{/if}</code
		></pre>
</div>
