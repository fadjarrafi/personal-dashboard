<script lang="ts">
	import ToolHeader from '$lib/components/tools/ToolHeader.svelte';
	import TextInput from '$lib/components/tools/TextInput.svelte';
	import CopyButton from '$lib/components/CopyButton.svelte';
	import { Badge } from '$lib/components/ui/badge/index.js';

	let input = $state('Héllo wörld 👋🏽​ — tab\there, NBSP here.');

	// Karakter tak terlihat / membingungkan yang sering menyusup lewat copy-paste.
	const INVISIBLE: Record<number, string> = {
		0x00a0: 'NO-BREAK SPACE',
		0x00ad: 'SOFT HYPHEN',
		0x034f: 'COMBINING GRAPHEME JOINER',
		0x061c: 'ARABIC LETTER MARK',
		0x115f: 'HANGUL CHOSEONG FILLER',
		0x180e: 'MONGOLIAN VOWEL SEPARATOR',
		0x2000: 'EN QUAD',
		0x2001: 'EM QUAD',
		0x2002: 'EN SPACE',
		0x2003: 'EM SPACE',
		0x2009: 'THIN SPACE',
		0x200a: 'HAIR SPACE',
		0x200b: 'ZERO WIDTH SPACE',
		0x200c: 'ZERO WIDTH NON-JOINER',
		0x200d: 'ZERO WIDTH JOINER',
		0x200e: 'LEFT-TO-RIGHT MARK',
		0x200f: 'RIGHT-TO-LEFT MARK',
		0x202a: 'LEFT-TO-RIGHT EMBEDDING',
		0x202b: 'RIGHT-TO-LEFT EMBEDDING',
		0x202c: 'POP DIRECTIONAL FORMATTING',
		0x202d: 'LEFT-TO-RIGHT OVERRIDE',
		0x202e: 'RIGHT-TO-LEFT OVERRIDE',
		0x202f: 'NARROW NO-BREAK SPACE',
		0x205f: 'MEDIUM MATHEMATICAL SPACE',
		0x2060: 'WORD JOINER',
		0x2066: 'LEFT-TO-RIGHT ISOLATE',
		0x2067: 'RIGHT-TO-LEFT ISOLATE',
		0x2068: 'FIRST STRONG ISOLATE',
		0x2069: 'POP DIRECTIONAL ISOLATE',
		0x3000: 'IDEOGRAPHIC SPACE',
		0x3164: 'HANGUL FILLER',
		0xfeff: 'ZERO WIDTH NO-BREAK SPACE (BOM)',
		0xfffc: 'OBJECT REPLACEMENT CHARACTER'
	};
	const CONTROL: Record<number, string> = {
		0x09: 'TAB',
		0x0a: 'LINE FEED',
		0x0d: 'CARRIAGE RETURN',
		0x00: 'NULL',
		0x1b: 'ESCAPE'
	};

	const enc = new TextEncoder();
	const segmenter =
		typeof Intl !== 'undefined' && 'Segmenter' in Intl
			? new Intl.Segmenter(undefined, { granularity: 'grapheme' })
			: null;
	const wordSeg =
		typeof Intl !== 'undefined' && 'Segmenter' in Intl
			? new Intl.Segmenter(undefined, { granularity: 'word' })
			: null;

	function category(c: string): string {
		if (/\p{Extended_Pictographic}/u.test(c)) return 'emoji';
		if (/\p{Lu}/u.test(c)) return 'uppercase';
		if (/\p{Ll}/u.test(c)) return 'lowercase';
		if (/\p{L}/u.test(c)) return 'letter';
		if (/\p{N}/u.test(c)) return 'number';
		if (/\p{M}/u.test(c)) return 'mark';
		if (/\p{Zs}|\s/u.test(c)) return 'space';
		if (/\p{P}/u.test(c)) return 'punct';
		if (/\p{S}/u.test(c)) return 'symbol';
		if (/\p{C}/u.test(c)) return 'control';
		return 'other';
	}

	const stats = $derived.by(() => {
		const cps = Array.from(input);
		const bytes = enc.encode(input).length;
		const graphemes = segmenter ? [...segmenter.segment(input)].length : cps.length;
		const words = wordSeg
			? [...wordSeg.segment(input)].filter((s) => s.isWordLike).length
			: (input.match(/\S+/g) ?? []).length;
		const lines = input ? input.split(/\r\n|\r|\n/).length : 0;
		const sentences = (input.match(/[^.!?]+[.!?]+/g) ?? []).length;
		return [
			['Characters (UTF-16 .length)', input.length],
			['Code points', cps.length],
			['Graphemes (visible chars)', graphemes],
			['Bytes (UTF-8)', bytes],
			['Words', words],
			['Lines', lines],
			['Sentences', sentences],
			['Whitespace', cps.filter((c) => /\s/u.test(c)).length]
		] as const;
	});

	const suspicious = $derived(
		Array.from(input)
			.map((c, i) => ({ c, i, cp: c.codePointAt(0)! }))
			.filter(
				({ cp }) =>
					INVISIBLE[cp] || (cp < 0x20 && cp !== 0x0a && cp !== 0x09 && cp !== 0x0d) || cp === 0x7f
			)
	);

	const cleaned = $derived(
		Array.from(input)
			.map((c) => {
				const cp = c.codePointAt(0)!;
				if (
					[0x00a0, 0x2000, 0x2001, 0x2002, 0x2003, 0x2009, 0x200a, 0x202f, 0x205f, 0x3000].includes(
						cp
					)
				)
					return ' ';
				if (
					INVISIBLE[cp] ||
					(cp < 0x20 && cp !== 0x0a && cp !== 0x09 && cp !== 0x0d) ||
					cp === 0x7f
				)
					return '';
				return c;
			})
			.join('')
	);

	const chars = $derived(
		Array.from(input.slice(0, 2000)).map((c) => {
			const cp = c.codePointAt(0)!;
			return {
				c,
				cp,
				hex: 'U+' + cp.toString(16).toUpperCase().padStart(4, '0'),
				utf8: Array.from(enc.encode(c), (b) => b.toString(16).toUpperCase().padStart(2, '0')).join(
					' '
				),
				cat: category(c),
				name: INVISIBLE[cp] ?? CONTROL[cp] ?? ''
			};
		})
	);

	const freq = $derived.by(() => {
		const m = new Map<string, number>();
		for (const c of input) if (!/\s/.test(c)) m.set(c, (m.get(c) ?? 0) + 1);
		return [...m].sort((a, b) => b[1] - a[1]).slice(0, 20);
	});
</script>

<ToolHeader slug="string-inspector" />

<div class="space-y-4">
	<TextInput bind:value={input} label="Text" height="h-36" mono={false} />

	<dl class="grid grid-cols-2 gap-2 sm:grid-cols-4">
		{#each stats as [label, n] (label)}
			<div class="bg-card rounded-lg border p-3">
				<dt class="label-mono">{label}</dt>
				<dd class="mt-1 text-xl font-semibold tabular-nums">{n.toLocaleString()}</dd>
			</div>
		{/each}
	</dl>

	{#if suspicious.length}
		<div class="border-warning/40 space-y-2 rounded-lg border p-3" role="alert">
			<div class="flex flex-wrap items-center justify-between gap-2">
				<p class="text-warning text-sm">
					⚠ {suspicious.length} invisible or unusual character{suspicious.length === 1 ? '' : 's'} found
				</p>
				<CopyButton text={cleaned} label="Copy cleaned text" variant="outline" size="sm" />
			</div>
			<div class="flex flex-wrap gap-1.5">
				{#each suspicious as s (s.i)}
					<Badge variant="outline" class="font-mono"
						>U+{s.cp.toString(16).toUpperCase().padStart(4, '0')}
						{INVISIBLE[s.cp] ?? 'CONTROL'}</Badge
					>
				{/each}
			</div>
		</div>
	{/if}

	{#if freq.length}
		<section class="space-y-2">
			<h2 class="label-mono">Most frequent</h2>
			<div class="flex flex-wrap gap-1.5">
				{#each freq as [c, n] (c)}
					<Badge variant="outline" class="font-mono"
						>{c} <span class="text-muted-foreground">×{n}</span></Badge
					>
				{/each}
			</div>
		</section>
	{/if}

	<section class="space-y-2">
		<h2 class="label-mono">Code points {input.length > 2000 ? '(first 2,000)' : ''}</h2>
		<div class="bg-card max-h-96 overflow-auto rounded-lg border">
			<table class="w-full text-left text-xs">
				<thead class="bg-card sticky top-0 border-b">
					<tr>
						<th class="label-mono px-3 py-1.5">Char</th>
						<th class="label-mono px-3 py-1.5">Code point</th>
						<th class="label-mono px-3 py-1.5">UTF-8</th>
						<th class="label-mono px-3 py-1.5">Category</th>
					</tr>
				</thead>
				<tbody class="divide-y font-mono">
					{#each chars as ch, i (i)}
						<tr class={ch.name && !CONTROL[ch.cp] ? 'bg-warning/10' : ''}>
							<td class="px-3 py-1">{ch.name ? '·' : ch.c}</td>
							<td class="px-3 py-1">{ch.hex}</td>
							<td class="px-3 py-1">{ch.utf8}</td>
							<td class="px-3 py-1">{ch.name || ch.cat}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</section>
</div>
