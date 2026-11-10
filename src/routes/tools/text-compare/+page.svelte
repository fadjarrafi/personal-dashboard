<script lang="ts">
	import { diffLines, diffArrays, diffWordsWithSpace, diffChars, type ChangeObject } from 'diff';
	import ToolHeader from '$lib/components/tools/ToolHeader.svelte';
	import Segmented from '$lib/components/tools/Segmented.svelte';
	import TextInput from '$lib/components/tools/TextInput.svelte';
	import { Checkbox } from '$lib/components/ui/checkbox/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import ArrowLeftRight from '@lucide/svelte/icons/arrow-left-right';

	let left = $state(
		'The quick brown fox\njumps over the lazy dog.\nLine three stays.\nRemoved line'
	);
	let right = $state(
		'The quick red fox\njumps over the lazy dog!\nLine three stays.\nAdded line\nAnother new line'
	);
	let mode = $state<'lines' | 'words' | 'chars'>('lines');
	let layout = $state<'split' | 'inline'>('split');
	let ignoreCase = $state(false);
	let ignoreWs = $state(false);

	const changes = $derived.by((): ChangeObject<string>[] => {
		if (mode === 'lines') {
			if (!ignoreCase) return diffLines(left, right, { ignoreWhitespace: ignoreWs });
			// diffLines tidak punya ignoreCase: diff per-baris dengan comparator sendiri.
			const norm = (l: string) => (ignoreWs ? l.trim() : l).toLowerCase();
			const split = (s: string) => s.split(/(?<=\n)/);
			return diffArrays(split(left), split(right), {
				comparator: (a, b) => norm(a.replace(/\n$/, '')) === norm(b.replace(/\n$/, ''))
			}).map((c) => ({ ...c, value: c.value.join('') }));
		}
		if (mode === 'words') return diffWordsWithSpace(left, right, { ignoreCase });
		return diffChars(left, right, { ignoreCase });
	});

	const stats = $derived(
		changes.reduce(
			(a, c) => {
				const n = mode === 'lines' ? (c.count ?? 0) : c.value.length;
				if (c.added) a.added += n;
				else if (c.removed) a.removed += n;
				return a;
			},
			{ added: 0, removed: 0 }
		)
	);

	type Row = {
		l: string | null;
		r: string | null;
		ln: number | null;
		rn: number | null;
		kind: 'same' | 'del' | 'add' | 'mod';
	};

	// Split view (mode lines): pasangkan blok removed+added berurutan sebagai baris "modified".
	const rows = $derived.by((): Row[] => {
		if (mode !== 'lines') return [];
		const out: Row[] = [];
		let ln = 1;
		let rn = 1;
		const lines = (v: string) => v.replace(/\n$/, '').split('\n');
		for (let i = 0; i < changes.length; i++) {
			const c = changes[i];
			if (c.removed && changes[i + 1]?.added) {
				const a = lines(c.value);
				const b = lines(changes[i + 1].value);
				for (let k = 0; k < Math.max(a.length, b.length); k++) {
					out.push({
						l: a[k] ?? null,
						r: b[k] ?? null,
						ln: a[k] !== undefined ? ln++ : null,
						rn: b[k] !== undefined ? rn++ : null,
						kind:
							a[k] !== undefined && b[k] !== undefined ? 'mod' : a[k] !== undefined ? 'del' : 'add'
					});
				}
				i++;
			} else if (c.removed)
				for (const l of lines(c.value)) out.push({ l, r: null, ln: ln++, rn: null, kind: 'del' });
			else if (c.added)
				for (const r of lines(c.value)) out.push({ l: null, r, ln: null, rn: rn++, kind: 'add' });
			else for (const l of lines(c.value)) out.push({ l, r: l, ln: ln++, rn: rn++, kind: 'same' });
		}
		return out;
	});

	const identical = $derived(changes.every((c) => !c.added && !c.removed));
</script>

<ToolHeader slug="text-compare" />

<div class="space-y-4">
	<div class="grid gap-4 lg:grid-cols-2">
		<TextInput bind:value={left} label="Original" height="h-48" />
		<TextInput bind:value={right} label="Changed" height="h-48" />
	</div>

	<div class="flex flex-wrap items-center gap-3">
		<Segmented
			bind:value={mode}
			options={[
				{ value: 'lines', label: 'Lines' },
				{ value: 'words', label: 'Words' },
				{ value: 'chars', label: 'Chars' }
			]}
			ariaLabel="Granularity"
		/>
		{#if mode === 'lines'}
			<Segmented
				bind:value={layout}
				options={[
					{ value: 'split', label: 'Side by side' },
					{ value: 'inline', label: 'Inline' }
				]}
				ariaLabel="Layout"
			/>
		{/if}
		<div class="flex items-center gap-2">
			<Checkbox id="tc-case" bind:checked={ignoreCase} />
			<Label for="tc-case" class="text-xs font-normal">Ignore case</Label>
		</div>
		{#if mode === 'lines'}
			<div class="flex items-center gap-2">
				<Checkbox id="tc-ws" bind:checked={ignoreWs} />
				<Label for="tc-ws" class="text-xs font-normal">Ignore whitespace</Label>
			</div>
		{/if}
		<Button variant="ghost" size="sm" onclick={() => ([left, right] = [right, left])}
			><ArrowLeftRight />Swap</Button
		>
		<span class="text-xs">
			<span class="text-success">+{stats.added}</span>
			<span class="text-destructive ms-1">−{stats.removed}</span>
			<span class="text-muted-foreground">{mode}</span>
		</span>
	</div>

	{#if identical}
		<p class="text-success text-sm">✓ No differences.</p>
	{:else if mode === 'lines' && layout === 'split'}
		<div class="bg-card overflow-x-auto rounded-lg border">
			<table class="w-full table-fixed font-mono text-xs">
				<colgroup><col class="w-10" /><col /><col class="w-10" /><col /></colgroup>
				<tbody>
					{#each rows as row, i (i)}
						<tr class="align-top">
							<td class="text-muted-foreground border-e px-1 text-right select-none"
								>{row.ln ?? ''}</td
							>
							<td
								class="border-e px-2 break-all whitespace-pre-wrap {row.kind === 'del' ||
								row.kind === 'mod'
									? 'bg-destructive/10'
									: ''}">{row.l ?? ''}</td
							>
							<td class="text-muted-foreground border-e px-1 text-right select-none"
								>{row.rn ?? ''}</td
							>
							<td
								class="px-2 break-all whitespace-pre-wrap {row.kind === 'add' || row.kind === 'mod'
									? 'bg-success/10'
									: ''}">{row.r ?? ''}</td
							>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{:else}
		<pre
			class="bg-card overflow-x-auto rounded-lg border p-3 font-mono text-xs break-all whitespace-pre-wrap">{#each changes as c, i (i)}{#if c.added}<ins
						class="bg-success/20 text-success no-underline">{c.value}</ins
					>{:else if c.removed}<del class="bg-destructive/20 text-destructive">{c.value}</del
					>{:else}<span>{c.value}</span>{/if}{/each}</pre>
	{/if}
</div>
