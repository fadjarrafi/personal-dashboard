<script lang="ts">
	import ToolHeader from '$lib/components/tools/ToolHeader.svelte';
	import TextInput from '$lib/components/tools/TextInput.svelte';
	import Output from '$lib/components/tools/Output.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Checkbox } from '$lib/components/ui/checkbox/index.js';
	import ArrowUp from '@lucide/svelte/icons/arrow-up';
	import { randomInt } from '$lib/tool-utils';

	let input = $state('banana\napple\n  cherry  \n\nApple\nbanana\nitem10\nitem2\n');
	let output = $state('');
	let caseSensitive = $state(false);
	let prefix = $state('');
	let suffix = $state('');
	let joinWith = $state(', ');
	let splitOn = $state(',');
	let filter = $state('');
	let lastOp = $state('');

	const collator = $derived(
		new Intl.Collator(undefined, { numeric: true, sensitivity: caseSensitive ? 'variant' : 'base' })
	);
	const lines = () => input.replace(/\r\n?/g, '\n').replace(/\n$/, '').split('\n');
	const key = (s: string) => (caseSensitive ? s : s.toLowerCase());

	function shuffle<T>(a: T[]): T[] {
		const b = [...a];
		for (let i = b.length - 1; i > 0; i--) {
			const j = randomInt(i + 1);
			[b[i], b[j]] = [b[j], b[i]];
		}
		return b;
	}

	const OPS: Record<string, [string, () => string]> = {
		sortAsc: ['Sort A→Z', () => lines().sort(collator.compare).join('\n')],
		sortDesc: [
			'Sort Z→A',
			() =>
				lines()
					.sort((a, b) => collator.compare(b, a))
					.join('\n')
		],
		sortLen: [
			'Sort by length',
			() =>
				lines()
					.sort((a, b) => a.length - b.length || collator.compare(a, b))
					.join('\n')
		],
		unique: [
			'Remove duplicates',
			() => {
				const seen = new Set<string>();
				return lines()
					.filter((l) => !seen.has(key(l)) && !!seen.add(key(l)))
					.join('\n');
			}
		],
		dupes: [
			'Only duplicates',
			() => {
				const count = new Map<string, number>();
				for (const l of lines()) count.set(key(l), (count.get(key(l)) ?? 0) + 1);
				const seen = new Set<string>();
				return lines()
					.filter((l) => count.get(key(l))! > 1 && !seen.has(key(l)) && !!seen.add(key(l)))
					.join('\n');
			}
		],
		reverse: ['Reverse order', () => lines().reverse().join('\n')],
		shuffle: ['Shuffle', () => shuffle(lines()).join('\n')],
		trim: [
			'Trim whitespace',
			() =>
				lines()
					.map((l) => l.trim())
					.join('\n')
		],
		noEmpty: [
			'Remove empty lines',
			() =>
				lines()
					.filter((l) => l.trim())
					.join('\n')
		],
		collapse: [
			'Collapse spaces',
			() =>
				lines()
					.map((l) => l.replace(/\s+/g, ' ').trim())
					.join('\n')
		],
		number: [
			'Number lines',
			() => {
				const ls = lines();
				const w = String(ls.length).length;
				return ls.map((l, i) => `${String(i + 1).padStart(w)}. ${l}`).join('\n');
			}
		],
		unnumber: [
			'Strip numbering',
			() =>
				lines()
					.map((l) => l.replace(/^\s*(\d+[.):]|[-*•])\s+/, ''))
					.join('\n')
		],
		lower: ['lowercase', () => input.toLowerCase()],
		upper: ['UPPERCASE', () => input.toUpperCase()],
		wrap: [
			'Add prefix / suffix',
			() =>
				lines()
					.map((l) => prefix + l + suffix)
					.join('\n')
		],
		quote: [
			"Wrap in 'quotes',",
			() =>
				lines()
					.map((l) => `'${l.replace(/'/g, "\\'")}'`)
					.join(',\n')
		],
		join: ['Join lines', () => lines().join(joinWith.replace(/\\n/g, '\n').replace(/\\t/g, '\t'))],
		split: [
			'Split into lines',
			() =>
				input
					.split(splitOn.replace(/\\n/g, '\n').replace(/\\t/g, '\t') || ',')
					.map((s) => s.trim())
					.join('\n')
		],
		grep: [
			'Keep matching',
			() => {
				const re = safeRe(filter);
				return lines()
					.filter((l) => re.test(l))
					.join('\n');
			}
		],
		grepV: [
			'Remove matching',
			() => {
				const re = safeRe(filter);
				return lines()
					.filter((l) => !re.test(l))
					.join('\n');
			}
		]
	};

	function safeRe(p: string): RegExp {
		try {
			return new RegExp(p, caseSensitive ? '' : 'i');
		} catch {
			return new RegExp(p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), caseSensitive ? '' : 'i');
		}
	}

	function apply(op: string) {
		output = OPS[op][1]();
		lastOp = OPS[op][0];
	}

	const groups: [string, string[]][] = [
		['Sort & order', ['sortAsc', 'sortDesc', 'sortLen', 'reverse', 'shuffle']],
		['Dedupe & clean', ['unique', 'dupes', 'trim', 'noEmpty', 'collapse']],
		['Transform', ['number', 'unnumber', 'lower', 'upper', 'quote']]
	];

	const count = (s: string) => (s ? s.replace(/\n$/, '').split('\n').length : 0);
</script>

<ToolHeader slug="line-tools" />

<div class="space-y-4">
	<div class="grid gap-4 lg:grid-cols-2">
		<div class="space-y-1">
			<TextInput bind:value={input} label="Lines" height="h-72" />
			<p class="text-muted-foreground text-xs">{count(input)} lines</p>
		</div>
		<div class="space-y-1">
			<Output
				value={output}
				label={lastOp ? `Result · ${lastOp}` : 'Result'}
				height="h-72"
				wrap={false}
			>
				{#snippet actions()}
					<Button
						variant="ghost"
						size="xs"
						disabled={!output}
						onclick={() => ((input = output), (output = ''), (lastOp = ''))}
						><ArrowUp />Use as input</Button
					>
				{/snippet}
			</Output>
			<p class="text-muted-foreground text-xs">{count(output)} lines</p>
		</div>
	</div>

	<div class="flex items-center gap-2">
		<Checkbox id="lt-case" bind:checked={caseSensitive} />
		<Label for="lt-case" class="text-xs font-normal">Case sensitive (sorting, dedupe, filter)</Label
		>
	</div>

	<div class="grid gap-4 md:grid-cols-3">
		{#each groups as [title, ops] (title)}
			<section class="space-y-2">
				<h2 class="label-mono">{title}</h2>
				<div class="flex flex-wrap gap-1.5">
					{#each ops as op (op)}<Button variant="outline" size="sm" onclick={() => apply(op)}
							>{OPS[op][0]}</Button
						>{/each}
				</div>
			</section>
		{/each}
	</div>

	<div class="grid gap-4 md:grid-cols-3">
		<section class="space-y-2">
			<h2 class="label-mono">Prefix / suffix</h2>
			<div class="flex gap-2">
				<Input class="h-8 font-mono" placeholder="prefix" bind:value={prefix} aria-label="Prefix" />
				<Input class="h-8 font-mono" placeholder="suffix" bind:value={suffix} aria-label="Suffix" />
			</div>
			<Button variant="outline" size="sm" onclick={() => apply('wrap')}>Apply</Button>
		</section>
		<section class="space-y-2">
			<h2 class="label-mono">Join / split</h2>
			<div class="flex gap-2">
				<Input class="h-8 font-mono" bind:value={joinWith} aria-label="Join separator" />
				<Button variant="outline" size="sm" onclick={() => apply('join')}>Join</Button>
			</div>
			<div class="flex gap-2">
				<Input class="h-8 font-mono" bind:value={splitOn} aria-label="Split separator" />
				<Button variant="outline" size="sm" onclick={() => apply('split')}>Split</Button>
			</div>
		</section>
		<section class="space-y-2">
			<h2 class="label-mono">Filter (text or regex)</h2>
			<Input
				class="h-8 font-mono"
				placeholder="e.g. ^item\d+"
				bind:value={filter}
				aria-label="Filter pattern"
			/>
			<div class="flex gap-2">
				<Button variant="outline" size="sm" onclick={() => apply('grep')}>Keep matching</Button>
				<Button variant="outline" size="sm" onclick={() => apply('grepV')}>Remove matching</Button>
			</div>
		</section>
	</div>
</div>
