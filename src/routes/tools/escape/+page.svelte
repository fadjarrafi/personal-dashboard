<script lang="ts">
	import ToolHeader from '$lib/components/tools/ToolHeader.svelte';
	import Segmented from '$lib/components/tools/Segmented.svelte';
	import TextInput from '$lib/components/tools/TextInput.svelte';
	import Output from '$lib/components/tools/Output.svelte';
	import { NativeSelect } from '$lib/components/ui/native-select/index.js';
	import { errorMessage } from '$lib/tool-utils';

	type Kind = 'html' | 'xml' | 'js' | 'json' | 'sql' | 'csv' | 'regex' | 'shell' | 'unicode';

	const KINDS: Array<[Kind, string]> = [
		['html', 'HTML entities'],
		['xml', 'XML'],
		['js', 'JavaScript string'],
		['json', 'JSON string'],
		['sql', 'SQL string literal'],
		['csv', 'CSV field'],
		['regex', 'RegExp'],
		['shell', 'Shell (POSIX single-quote)'],
		['unicode', 'Unicode \\uXXXX']
	];

	let kind = $state<Kind>('html');
	let direction = $state<'escape' | 'unescape'>('escape');
	let input = $state(`<a href="/?q=1&x='y'">Café “quote”</a>`);

	const XML: Record<string, string> = {
		'&': '&amp;',
		'<': '&lt;',
		'>': '&gt;',
		'"': '&quot;',
		"'": '&apos;'
	};
	const HTML: Record<string, string> = { ...XML, "'": '&#39;' };

	const JS_ESC: Record<string, string> = {
		'\n': '\\n',
		'\r': '\\r',
		'\t': '\\t',
		'\b': '\\b',
		'\f': '\\f',
		'\v': '\\v',
		'\0': '\\0'
	};

	function jsEscape(s: string): string {
		return s.replace(/[\\'"`\n\r\t\b\f\v\0\u2028\u2029]|[\x00-\x1f\x7f]/g, (c) => {
			if (c === '\\' || c === "'" || c === '"' || c === '`') return '\\' + c;
			return JS_ESC[c] ?? '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0');
		});
	}

	function jsUnescape(s: string): string {
		return s.replace(
			/\\(?:u\{([0-9a-fA-F]+)\}|u([0-9a-fA-F]{4})|x([0-9a-fA-F]{2})|([0-7]{1,3})|([\s\S]))/g,
			(_m, cp, u4, x2, oct, ch) => {
				if (cp) return String.fromCodePoint(parseInt(cp, 16));
				if (u4) return String.fromCharCode(parseInt(u4, 16));
				if (x2) return String.fromCharCode(parseInt(x2, 16));
				if (oct) return String.fromCharCode(parseInt(oct, 8));
				const map: Record<string, string> = {
					n: '\n',
					r: '\r',
					t: '\t',
					b: '\b',
					f: '\f',
					v: '\v',
					'\n': ''
				};
				return map[ch] ?? ch;
			}
		);
	}

	function decodeEntities(s: string): string {
		const doc = new DOMParser().parseFromString(
			`<!doctype html><body>${s.replace(/</g, '&lt;')}`,
			'text/html'
		);
		return doc.body.textContent ?? '';
	}

	function escape(s: string): string {
		switch (kind) {
			case 'html':
				return s.replace(/[&<>"']/g, (c) => HTML[c]);
			case 'xml':
				return s.replace(/[&<>"']/g, (c) => XML[c]);
			case 'js':
				return jsEscape(s);
			case 'json':
				return JSON.stringify(s).slice(1, -1);
			case 'sql':
				return `'${s.replace(/'/g, "''")}'`;
			case 'csv':
				return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
			case 'regex':
				return s.replace(/[.*+?^${}()|[\]\\/-]/g, '\\$&');
			case 'shell':
				return `'${s.replace(/'/g, `'\\''`)}'`;
			case 'unicode':
				return Array.from(s, (c) => {
					const cp = c.codePointAt(0)!;
					if (cp < 0x80) return c;
					if (cp <= 0xffff) return '\\u' + cp.toString(16).padStart(4, '0');
					// Pasangan surrogate agar kompatibel Java/JSON.
					return Array.from(
						{ length: 2 },
						(_, i) => '\\u' + c.charCodeAt(i).toString(16).padStart(4, '0')
					).join('');
				}).join('');
		}
	}

	function unescape(s: string): string {
		switch (kind) {
			case 'html':
			case 'xml':
				return decodeEntities(s);
			case 'js':
			case 'unicode':
				return jsUnescape(s);
			case 'json':
				return JSON.parse(`"${s.replace(/^"|"$/g, '')}"`);
			case 'sql':
				return s.replace(/^'|'$/g, '').replace(/''/g, "'");
			case 'csv':
				return /^".*"$/s.test(s) ? s.slice(1, -1).replace(/""/g, '"') : s;
			case 'regex':
				return s.replace(/\\(.)/g, '$1');
			case 'shell':
				return s.replace(/'\\''/g, "'").replace(/^'|'$/g, '');
		}
	}

	const out = $derived.by(() => {
		try {
			return { value: direction === 'escape' ? escape(input) : unescape(input), error: null };
		} catch (e) {
			return { value: '', error: errorMessage(e) };
		}
	});
</script>

<ToolHeader slug="escape" />

<div class="space-y-3">
	<div class="flex flex-wrap items-center gap-3">
		<NativeSelect size="sm" bind:value={kind} aria-label="Format">
			{#each KINDS as [k, label] (k)}<option value={k}>{label}</option>{/each}
		</NativeSelect>
		<Segmented
			bind:value={direction}
			options={[
				{ value: 'escape', label: 'Escape' },
				{ value: 'unescape', label: 'Unescape' }
			]}
			ariaLabel="Direction"
		/>
	</div>
	<div class="grid gap-4 lg:grid-cols-2">
		<TextInput bind:value={input} />
		<Output value={out.value} error={out.error} />
	</div>
</div>
