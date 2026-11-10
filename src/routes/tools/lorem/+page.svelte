<script lang="ts">
	import ToolHeader from '$lib/components/tools/ToolHeader.svelte';
	import Segmented from '$lib/components/tools/Segmented.svelte';
	import Output from '$lib/components/tools/Output.svelte';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Checkbox } from '$lib/components/ui/checkbox/index.js';
	import RefreshCw from '@lucide/svelte/icons/refresh-cw';

	const WORDS =
		'lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua enim ad minim veniam quis nostrud exercitation ullamco laboris nisi aliquip ex ea commodo consequat duis aute irure in reprehenderit voluptate velit esse cillum fugiat nulla pariatur excepteur sint occaecat cupidatat non proident sunt culpa qui officia deserunt mollit anim id est laborum curabitur pretium tincidunt lacus nunc pulvinar sapien ligula mauris vitae ultricies leo integer malesuada facilisis morbi tristique senectus netus fames ac turpis egestas pellentesque habitant purus viverra accumsan maecenas sollicitudin feugiat nibh cras fermentum odio eu feugiat pretium vulputate sapien nec sagittis aliquam faucibus'.split(
			' '
		);
	const OPENING = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit';

	let unit = $state<'paragraphs' | 'sentences' | 'words'>('paragraphs');
	let amount = $state(3);
	let startWithLorem = $state(true);
	let html = $state(false);
	let seed = $state(0);

	// Math.random cukup di sini — teks placeholder tidak butuh keacakan kriptografis.
	const pick = () => WORDS[Math.floor(Math.random() * WORDS.length)];
	const range = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1));
	const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

	function sentence(): string {
		const n = range(6, 16);
		const words = Array.from({ length: n }, pick);
		if (n > 9) words[range(3, n - 4)] += ',';
		return cap(words.join(' ')) + (Math.random() < 0.1 ? '?' : '.');
	}
	const paragraph = () => Array.from({ length: range(3, 7) }, sentence).join(' ');

	const text = $derived.by(() => {
		void seed;
		const n = Math.min(Math.max(Math.floor(amount) || 1, 1), 500);
		if (unit === 'words') {
			const w = Array.from({ length: n }, pick);
			if (startWithLorem)
				w.splice(
					0,
					Math.min(n, 5),
					...OPENING.replace(',', '').toLowerCase().split(' ').slice(0, Math.min(n, 5))
				);
			const s = cap(w.join(' '));
			return html ? `<p>${s}</p>` : s;
		}
		const items = Array.from({ length: n }, unit === 'paragraphs' ? paragraph : sentence);
		if (startWithLorem) items[0] = items[0].replace(/^[^.?]*[.?]/, OPENING + '.');
		if (unit === 'sentences') return html ? `<p>${items.join(' ')}</p>` : items.join(' ');
		return html ? items.map((p) => `<p>${p}</p>`).join('\n') : items.join('\n\n');
	});

	const words = $derived(
		text
			.replace(/<[^>]+>/g, '')
			.split(/\s+/)
			.filter(Boolean).length
	);
</script>

<ToolHeader slug="lorem" />

<div class="max-w-4xl space-y-3">
	<div class="flex flex-wrap items-end gap-3">
		<Segmented
			bind:value={unit}
			options={[
				{ value: 'paragraphs', label: 'Paragraphs' },
				{ value: 'sentences', label: 'Sentences' },
				{ value: 'words', label: 'Words' }
			]}
			ariaLabel="Unit"
		/>
		<div class="grid w-24 gap-1.5">
			<Label for="li-n" class="text-xs">Amount</Label>
			<Input id="li-n" class="h-8" type="number" min="1" max="500" bind:value={amount} />
		</div>
		<div class="flex h-8 items-center gap-2">
			<Checkbox id="li-start" bind:checked={startWithLorem} />
			<Label for="li-start" class="text-xs font-normal">Start with “Lorem ipsum”</Label>
		</div>
		<div class="flex h-8 items-center gap-2">
			<Checkbox id="li-html" bind:checked={html} />
			<Label for="li-html" class="text-xs font-normal">HTML &lt;p&gt;</Label>
		</div>
		<Button size="sm" onclick={() => seed++}><RefreshCw />Regenerate</Button>
	</div>
	<Output value={text} label="{words} words · {text.length} characters" height="h-[28rem]" />
</div>
