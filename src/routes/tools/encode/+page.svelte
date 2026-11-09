<script lang="ts">
	import CopyButton from '$lib/components/CopyButton.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import Segmented from '$lib/components/tools/Segmented.svelte';
	import ArrowUp from '@lucide/svelte/icons/arrow-up';
	import ToolHeader from '$lib/components/tools/ToolHeader.svelte';

	type Codec = 'base64' | 'base64url' | 'url' | 'html';

	const codecs: Array<[Codec, string]> = [
		['base64', 'Base64'],
		['base64url', 'Base64URL'],
		['url', 'URL'],
		['html', 'HTML']
	];

	let codec = $state<Codec>('base64');
	let input = $state('');
	let output = $state('');
	let error = $state<string | null>(null);

	function bytesToBase64(bytes: Uint8Array): string {
		let bin = '';
		for (const b of bytes) bin += String.fromCharCode(b);
		return btoa(bin);
	}

	function base64ToText(b64: string): string {
		const bin = atob(b64.replace(/\s+/g, ''));
		const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
		return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
	}

	const HTML_ESCAPES: Record<string, string> = {
		'&': '&amp;',
		'<': '&lt;',
		'>': '&gt;',
		'"': '&quot;',
		"'": '&#39;'
	};

	function encode(s: string): string {
		switch (codec) {
			case 'base64':
				return bytesToBase64(new TextEncoder().encode(s));
			case 'base64url':
				return bytesToBase64(new TextEncoder().encode(s))
					.replace(/\+/g, '-')
					.replace(/\//g, '_')
					.replace(/=+$/, '');
			case 'url':
				return encodeURIComponent(s);
			case 'html':
				return s.replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);
		}
	}

	function decode(s: string): string {
		switch (codec) {
			case 'base64':
				return base64ToText(s);
			case 'base64url': {
				const b64 = s.trim().replace(/-/g, '+').replace(/_/g, '/');
				return base64ToText(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
			}
			case 'url':
				return decodeURIComponent(s.replace(/\+/g, ' '));
			case 'html': {
				const doc = new DOMParser().parseFromString(s, 'text/html');
				return doc.documentElement.textContent ?? '';
			}
		}
	}

	function run(dir: 'encode' | 'decode') {
		error = null;
		try {
			output = dir === 'encode' ? encode(input) : decode(input);
		} catch (e) {
			output = '';
			error = `Failed to ${dir}: ${e instanceof Error ? e.message : e}`;
		}
	}

	function useOutput() {
		input = output;
		output = '';
	}
</script>

<ToolHeader slug="encode" />

<div class="space-y-3">
	<Segmented
		bind:value={codec}
		options={codecs.map(([value, label]) => ({ value, label }))}
		ariaLabel="Encoding type"
	/>

	<div class="grid gap-4 lg:grid-cols-2">
		<section class="space-y-2">
			<span class="label-mono">Input</span>
			<Textarea
				class="bg-well h-56 font-mono text-xs"
				bind:value={input}
				spellcheck="false"
				aria-label="Input"
			/>
			<div class="flex flex-wrap gap-2">
				<Button size="sm" onclick={() => run('encode')}>Encode</Button>
				<Button variant="outline" size="sm" onclick={() => run('decode')}>Decode</Button>
				<Button variant="outline" size="sm" onclick={useOutput} disabled={!output}>
					<ArrowUp />Use output
				</Button>
			</div>
		</section>
		<section class="space-y-2">
			<div class="flex items-center justify-between">
				<span class="label-mono">Output</span>
				<CopyButton text={output} />
			</div>
			{#if error}
				<p
					role="alert"
					class="border-destructive/40 text-destructive rounded-md border p-3 text-sm"
				>
					{error}
				</p>
			{:else}
				<pre
					class="bg-well h-56 overflow-auto rounded-md border p-3 font-mono text-xs break-all whitespace-pre-wrap">{output ||
						'—'}</pre>
			{/if}
		</section>
	</div>
</div>
