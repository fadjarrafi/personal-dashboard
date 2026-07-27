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
</script>

<pre
	class="hljs overflow-auto rounded-box border border-base-300 p-3 text-xs leading-relaxed"
	style="max-height: {maxHeight}"><code
		>{#if ready}<!-- eslint-disable-next-line svelte/no-at-html-tags -->{@html html}{:else}{code}{/if}</code
	></pre>
