<script lang="ts">
	import ToolHeader from '$lib/components/tools/ToolHeader.svelte';
	import TextInput from '$lib/components/tools/TextInput.svelte';
	import Output from '$lib/components/tools/Output.svelte';
	import { NativeSelect } from '$lib/components/ui/native-select/index.js';
	import { errorMessage } from '$lib/tool-utils';

	type Op = 'unserialize' | 'serialize' | 'json2array' | 'array2json';
	const OPS: Array<[Op, string, string, string]> = [
		['unserialize', 'unserialize() → JSON', 'Serialized PHP', 'JSON'],
		['serialize', 'JSON → serialize()', 'JSON', 'Serialized PHP'],
		['json2array', 'JSON → PHP array', 'JSON', 'PHP array'],
		['array2json', 'PHP array → JSON', 'PHP array literal', 'JSON']
	];

	let op = $state<Op>('unserialize');
	let input = $state(
		'a:3:{s:4:"name";s:5:"Fadly";s:3:"age";i:30;s:4:"tags";a:2:{i:0;s:3:"php";i:1;s:2:"js";}}'
	);
	const meta = $derived(OPS.find((o) => o[0] === op)!);

	const enc = new TextEncoder();
	const dec = new TextDecoder();

	// Panjang string di serialize() PHP dihitung dalam byte (UTF-8), bukan karakter.
	function unserialize(src: string): unknown {
		const bytes = enc.encode(src);
		let i = 0;
		const readUntil = (ch: string) => {
			const end = bytes.indexOf(ch.charCodeAt(0), i);
			if (end < 0) throw new Error(`Expected “${ch}” after offset ${i}`);
			const s = dec.decode(bytes.subarray(i, end));
			i = end + 1;
			return s;
		};
		const expect = (ch: string) => {
			if (bytes[i] !== ch.charCodeAt(0)) throw new Error(`Expected “${ch}” at offset ${i}`);
			i++;
		};
		const value = (): unknown => {
			const type = String.fromCharCode(bytes[i]);
			i += 1;
			if (type === 'N') {
				expect(';');
				return null;
			}
			expect(':');
			switch (type) {
				case 'b':
					return readUntil(';') === '1';
				case 'i':
					return parseInt(readUntil(';'), 10);
				case 'd': {
					const s = readUntil(';');
					return s === 'INF'
						? Infinity
						: s === '-INF'
							? -Infinity
							: s === 'NAN'
								? NaN
								: parseFloat(s);
				}
				case 's': {
					const len = parseInt(readUntil(':'), 10);
					expect('"');
					const s = dec.decode(bytes.subarray(i, i + len));
					i += len;
					expect('"');
					expect(';');
					return s;
				}
				case 'a': {
					const n = parseInt(readUntil(':'), 10);
					expect('{');
					const entries: [unknown, unknown][] = [];
					for (let k = 0; k < n; k++) entries.push([value(), value()]);
					expect('}');
					const isList = entries.every(([k], idx) => k === idx);
					return isList
						? entries.map(([, v]) => v)
						: Object.fromEntries(entries.map(([k, v]) => [String(k), v]));
				}
				case 'O': {
					readUntil(':');
					expect('"');
					const cls = readUntil('"');
					expect(':');
					const n = parseInt(readUntil(':'), 10);
					expect('{');
					const obj: Record<string, unknown> = { __class: cls };
					for (let k = 0; k < n; k++) {
						// Properti private/protected diawali \0Class\0 atau \0*\0.
						const key = String(value()).replace(/^\0[^\0]*\0/, '');
						obj[key] = value();
					}
					expect('}');
					return obj;
				}
				default:
					throw new Error(`Unsupported type “${type}” at offset ${i - 2}`);
			}
		};
		const result = value();
		return result;
	}

	function serialize(v: unknown): string {
		if (v === null || v === undefined) return 'N;';
		if (typeof v === 'boolean') return `b:${v ? 1 : 0};`;
		if (typeof v === 'number') return Number.isInteger(v) ? `i:${v};` : `d:${v};`;
		if (typeof v === 'string') return `s:${enc.encode(v).length}:"${v}";`;
		const entries = Array.isArray(v)
			? v.map((x, i) => [i, x] as const)
			: Object.entries(v as object);
		const body = entries
			.map(
				([k, x]) =>
					(typeof k === 'number' || /^(0|[1-9]\d*)$/.test(k) ? `i:${k};` : serialize(k)) +
					serialize(x)
			)
			.join('');
		return `a:${entries.length}:{${body}}`;
	}

	const phpStr = (s: string) => `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;

	function toPhpArray(v: unknown, depth = 0): string {
		const pad = '    '.repeat(depth + 1);
		const end = '    '.repeat(depth);
		if (v === null || v === undefined) return 'null';
		if (typeof v === 'boolean') return v ? 'true' : 'false';
		if (typeof v === 'number') return String(v);
		if (typeof v === 'string') return phpStr(v);
		if (Array.isArray(v)) {
			if (!v.length) return '[]';
			return `[\n${v.map((x) => pad + toPhpArray(x, depth + 1)).join(',\n')},\n${end}]`;
		}
		const e = Object.entries(v as object);
		if (!e.length) return '[]';
		return `[\n${e.map(([k, x]) => `${pad}${phpStr(k)} => ${toPhpArray(x, depth + 1)}`).join(',\n')},\n${end}]`;
	}

	// Parser kecil untuk literal array PHP: [..], array(..), 'str', "str", angka, true/false/null, =>.
	function parsePhpArray(src: string): unknown {
		let i = 0;
		const ws = () => {
			while (i < src.length) {
				if (/\s/.test(src[i])) i++;
				else if (src.startsWith('//', i) || src[i] === '#')
					i = src.indexOf('\n', i) < 0 ? src.length : src.indexOf('\n', i);
				else if (src.startsWith('/*', i)) i = src.indexOf('*/', i) + 2;
				else break;
			}
		};
		const fail = (msg: string): never => {
			throw new Error(`${msg} at offset ${i}`);
		};
		const str = (): string => {
			const q = src[i++];
			let s = '';
			while (i < src.length && src[i] !== q) {
				if (src[i] === '\\') {
					const n = src[++i];
					const map: Record<string, string> =
						q === '"'
							? { n: '\n', t: '\t', r: '\r', $: '$', '"': '"', '\\': '\\' }
							: { "'": "'", '\\': '\\' };
					s += map[n] ?? '\\' + n;
					i++;
				} else s += src[i++];
			}
			if (src[i] !== q) fail('Unterminated string');
			i++;
			return s;
		};
		const val = (): unknown => {
			ws();
			const c = src[i];
			if (c === "'" || c === '"') return str();
			if (c === '[' || /^array\s*\(/i.test(src.slice(i))) {
				const close = c === '[' ? ']' : ')';
				i = c === '[' ? i + 1 : src.indexOf('(', i) + 1;
				const entries: [string | number, unknown][] = [];
				let next = 0;
				for (;;) {
					ws();
					if (src[i] === close) {
						i++;
						break;
					}
					const first = val();
					ws();
					if (src.startsWith('=>', i)) {
						i += 2;
						const key = typeof first === 'number' ? first : String(first);
						if (typeof key === 'number' && key >= next) next = key + 1;
						entries.push([key, val()]);
					} else entries.push([next++, first]);
					ws();
					if (src[i] === ',') i++;
					else if (src[i] !== close) fail(`Expected “,” or “${close}”`);
				}
				const isList = entries.every(([k], idx) => k === idx);
				return isList
					? entries.map(([, v]) => v)
					: Object.fromEntries(entries.map(([k, v]) => [String(k), v]));
			}
			const m = src.slice(i).match(/^(-?\d+(?:\.\d+)?(?:e[+-]?\d+)?|true|false|null)/i);
			if (!m) fail('Unexpected token');
			i += m![0].length;
			const t = m![0].toLowerCase();
			return t === 'true' ? true : t === 'false' ? false : t === 'null' ? null : Number(t);
		};
		const body = src
			.trim()
			.replace(/^<\?php\s*/, '')
			.replace(/^(return|\$\w+\s*=)\s*/, '')
			.replace(/;\s*$/, '');
		src = body;
		const result = val();
		ws();
		if (i < src.length) fail('Trailing characters');
		return result;
	}

	const out = $derived.by(() => {
		if (!input.trim()) return { value: '', error: null };
		try {
			switch (op) {
				case 'unserialize':
					return { value: JSON.stringify(unserialize(input.trim()), null, 2), error: null };
				case 'serialize':
					return { value: serialize(JSON.parse(input)), error: null };
				case 'json2array':
					return { value: `<?php\n\nreturn ${toPhpArray(JSON.parse(input))};\n`, error: null };
				case 'array2json':
					return { value: JSON.stringify(parsePhpArray(input), null, 2), error: null };
			}
		} catch (e) {
			return { value: '', error: errorMessage(e) };
		}
	});
</script>

<ToolHeader slug="php" />

<div class="space-y-3">
	<NativeSelect size="sm" bind:value={op} aria-label="Operation">
		{#each OPS as [k, label] (k)}<option value={k}>{label}</option>{/each}
	</NativeSelect>
	<div class="grid gap-4 lg:grid-cols-2">
		<TextInput bind:value={input} label={meta[2]} height="h-96" />
		<Output
			value={out.value}
			error={out.error}
			label={meta[3]}
			height="h-96"
			wrap={op === 'serialize'}
		/>
	</div>
	{#if op === 'unserialize'}
		<p class="text-muted-foreground text-xs">
			Objects are returned with a “__class” key; private/protected property prefixes are stripped.
		</p>
	{/if}
</div>
