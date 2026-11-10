<script lang="ts">
	import ToolHeader from '$lib/components/tools/ToolHeader.svelte';
	import TextInput from '$lib/components/tools/TextInput.svelte';
	import CopyButton from '$lib/components/CopyButton.svelte';
	import { splitWords } from '$lib/tool-utils';

	let input = $state('hello world from personalDashboard_v2');

	const cap = (w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
	const SMALL = new Set([
		'a',
		'an',
		'and',
		'as',
		'at',
		'but',
		'by',
		'for',
		'in',
		'of',
		'on',
		'or',
		'the',
		'to',
		'vs',
		'via'
	]);

	// Setiap baris dikonversi terpisah supaya daftar nama bisa diubah sekaligus.
	const CASES: Array<[string, (w: string[], raw: string) => string]> = [
		['camelCase', (w) => w.map((x, i) => (i ? cap(x) : x.toLowerCase())).join('')],
		['PascalCase', (w) => w.map(cap).join('')],
		['snake_case', (w) => w.map((x) => x.toLowerCase()).join('_')],
		['CONSTANT_CASE', (w) => w.map((x) => x.toUpperCase()).join('_')],
		['kebab-case', (w) => w.map((x) => x.toLowerCase()).join('-')],
		['COBOL-CASE', (w) => w.map((x) => x.toUpperCase()).join('-')],
		['Train-Case', (w) => w.map(cap).join('-')],
		['dot.case', (w) => w.map((x) => x.toLowerCase()).join('.')],
		['path/case', (w) => w.map((x) => x.toLowerCase()).join('/')],
		[
			'Title Case',
			(w) =>
				w
					.map((x, i) =>
						i && i < w.length - 1 && SMALL.has(x.toLowerCase()) ? x.toLowerCase() : cap(x)
					)
					.join(' ')
		],
		['Sentence case', (w) => w.map((x, i) => (i ? x.toLowerCase() : cap(x))).join(' ')],
		['lower case', (w) => w.map((x) => x.toLowerCase()).join(' ')],
		['UPPER CASE', (w) => w.map((x) => x.toUpperCase()).join(' ')],
		['lowercase (raw)', (_w, raw) => raw.toLowerCase()],
		['UPPERCASE (raw)', (_w, raw) => raw.toUpperCase()],
		[
			'aLtErNaTiNg',
			(_w, raw) => {
				let i = 0;
				return Array.from(raw, (c) =>
					/\p{L}/u.test(c) ? (i++ % 2 ? c.toUpperCase() : c.toLowerCase()) : c
				).join('');
			}
		],
		[
			'iNVERSE',
			(_w, raw) =>
				Array.from(raw, (c) => (c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase())).join('')
		]
	];

	const results = $derived(
		CASES.map(([name, fn]) => ({
			name,
			value: input
				.split('\n')
				.map((line) => fn(splitWords(line), line))
				.join('\n')
		}))
	);
</script>

<ToolHeader slug="case" />

<div class="space-y-4">
	<TextInput bind:value={input} label="Text (one identifier per line works too)" height="h-28" />

	<dl class="bg-card divide-y rounded-lg border">
		{#each results as r (r.name)}
			<div class="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2">
				<dt class="label-mono w-36 shrink-0">{r.name}</dt>
				<dd class="flex min-w-0 flex-1 items-center gap-1">
					<code class="min-w-0 flex-1 font-mono text-xs break-all whitespace-pre-wrap"
						>{r.value || '—'}</code
					>
					<CopyButton text={r.value} />
				</dd>
			</div>
		{/each}
	</dl>
</div>
