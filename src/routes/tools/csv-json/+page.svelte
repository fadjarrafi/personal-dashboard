<script lang="ts">
	import ToolHeader from '$lib/components/tools/ToolHeader.svelte';
	import Segmented from '$lib/components/tools/Segmented.svelte';
	import TextInput from '$lib/components/tools/TextInput.svelte';
	import Output from '$lib/components/tools/Output.svelte';
	import { NativeSelect } from '$lib/components/ui/native-select/index.js';
	import { Checkbox } from '$lib/components/ui/checkbox/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { errorMessage } from '$lib/tool-utils';

	let direction = $state<'csv2json' | 'json2csv'>('csv2json');
	let delimiter = $state<'auto' | ',' | ';' | '\t' | '|'>('auto');
	let header = $state(true);
	let inferTypes = $state(true);
	let input = $state(
		'id,name,price,active\n1,Kopi susu,"18,000",true\n2,"Teh ""manis""",12000,false'
	);

	function detect(text: string): string {
		const firstLine = text.split(/\r?\n/, 1)[0] ?? '';
		let best = ',';
		let bestCount = -1;
		for (const d of [',', ';', '\t', '|']) {
			const n = firstLine.split(d).length;
			if (n > bestCount) [best, bestCount] = [d, n];
		}
		return best;
	}

	// Parser CSV RFC 4180: field ber-quote boleh berisi delimiter, newline, dan "" (escape).
	function parseCsv(text: string, d: string): string[][] {
		const rows: string[][] = [];
		let row: string[] = [];
		let field = '';
		let quoted = false;
		for (let i = 0; i < text.length; i++) {
			const c = text[i];
			if (quoted) {
				if (c === '"') {
					if (text[i + 1] === '"') {
						field += '"';
						i++;
					} else quoted = false;
				} else field += c;
			} else if (c === '"' && field === '') quoted = true;
			else if (c === d) {
				row.push(field);
				field = '';
			} else if (c === '\n' || c === '\r') {
				if (c === '\r' && text[i + 1] === '\n') i++;
				row.push(field);
				rows.push(row);
				row = [];
				field = '';
			} else field += c;
		}
		if (quoted) throw new Error('Unterminated quoted field');
		if (field !== '' || row.length) {
			row.push(field);
			rows.push(row);
		}
		return rows.filter((r) => !(r.length === 1 && r[0] === ''));
	}

	function infer(v: string): unknown {
		if (!inferTypes) return v;
		const t = v.trim();
		if (t === '') return '';
		if (t === 'true' || t === 'false') return t === 'true';
		if (t === 'null') return null;
		if (
			/^-?(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?$/.test(t) &&
			Number.isSafeInteger(Math.trunc(Number(t)))
		)
			return Number(t);
		return v;
	}

	function csvField(v: unknown, d: string): string {
		if (v === null || v === undefined) return '';
		const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
		return s.includes(d) || /["\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
	}

	const result = $derived.by((): { value: string; error: string | null; info: string } => {
		if (!input.trim()) return { value: '', error: null, info: '' };
		try {
			if (direction === 'csv2json') {
				const d = delimiter === 'auto' ? detect(input) : delimiter;
				const rows = parseCsv(input, d);
				if (!header) {
					const data = rows.map((r) => r.map(infer));
					return { value: JSON.stringify(data, null, 2), error: null, info: `${data.length} rows` };
				}
				const [head = [], ...body] = rows;
				const keys = head.map((h, i) => h.trim() || `column${i + 1}`);
				const data = body.map((r) =>
					Object.fromEntries(keys.map((k, i) => [k, infer(r[i] ?? '')]))
				);
				const dName = d === '\t' ? 'tab' : `“${d}”`;
				return {
					value: JSON.stringify(data, null, 2),
					error: null,
					info: `${data.length} rows · ${keys.length} columns · delimiter ${dName}`
				};
			}
			const d = delimiter === 'auto' ? ',' : delimiter;
			const parsed = JSON.parse(input);
			const arr: unknown[] = Array.isArray(parsed) ? parsed : [parsed];
			if (arr.every((r) => Array.isArray(r))) {
				const lines = (arr as unknown[][]).map((r) => r.map((v) => csvField(v, d)).join(d));
				return { value: lines.join('\n'), error: null, info: `${arr.length} rows` };
			}
			const keys = [
				...new Set(arr.flatMap((r) => (r && typeof r === 'object' ? Object.keys(r) : [])))
			];
			const lines = arr.map((r) =>
				keys.map((k) => csvField((r as Record<string, unknown>)?.[k], d)).join(d)
			);
			if (header) lines.unshift(keys.map((k) => csvField(k, d)).join(d));
			return {
				value: lines.join('\n'),
				error: null,
				info: `${arr.length} rows · ${keys.length} columns`
			};
		} catch (e) {
			return { value: '', error: errorMessage(e), info: '' };
		}
	});
</script>

<ToolHeader slug="csv-json" />

<div class="space-y-3">
	<div class="flex flex-wrap items-center gap-3">
		<Segmented
			bind:value={direction}
			options={[
				{ value: 'csv2json', label: 'CSV → JSON' },
				{ value: 'json2csv', label: 'JSON → CSV' }
			]}
			ariaLabel="Direction"
		/>
		<NativeSelect size="sm" bind:value={delimiter} aria-label="Delimiter">
			<option value="auto">{direction === 'csv2json' ? 'Auto-detect' : 'Comma (,)'}</option>
			<option value=",">Comma (,)</option>
			<option value=";">Semicolon (;)</option>
			<option value={'\t'}>Tab</option>
			<option value="|">Pipe (|)</option>
		</NativeSelect>
		<div class="flex items-center gap-2">
			<Checkbox id="csv-header" bind:checked={header} />
			<Label for="csv-header" class="text-xs font-normal">Header row</Label>
		</div>
		{#if direction === 'csv2json'}
			<div class="flex items-center gap-2">
				<Checkbox id="csv-infer" bind:checked={inferTypes} />
				<Label for="csv-infer" class="text-xs font-normal">Infer numbers / booleans</Label>
			</div>
		{/if}
	</div>
	<div class="grid gap-4 lg:grid-cols-2">
		<TextInput bind:value={input} label={direction === 'csv2json' ? 'CSV' : 'JSON'} height="h-80" />
		<Output
			value={result.value}
			error={result.error}
			label={direction === 'csv2json' ? 'JSON' : 'CSV'}
			height="h-80"
			wrap={false}
		/>
	</div>
	{#if result.info}<p class="text-muted-foreground text-xs">{result.info}</p>{/if}
</div>
