<script lang="ts">
	import ToolHeader from '$lib/components/tools/ToolHeader.svelte';
	import CopyButton from '$lib/components/CopyButton.svelte';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Checkbox } from '$lib/components/ui/checkbox/index.js';

	const DIGITS = '0123456789abcdefghijklmnopqrstuvwxyz';

	// Nilai disimpan sebagai BigInt supaya angka > 2^53 tetap presisi.
	let value = $state<bigint | null>(255n);
	let error = $state<string | null>(null);
	let customBase = $state(36);
	let group = $state(true);
	let editing = $state<number | null>(null);
	let drafts = $state<Record<number, string>>({});

	function parse(s: string, base: number): bigint {
		let t = s.trim().toLowerCase().replace(/[\s_]/g, '');
		let neg = false;
		if (t.startsWith('-')) {
			neg = true;
			t = t.slice(1);
		}
		const prefix = { 2: '0b', 8: '0o', 16: '0x' }[base];
		if (prefix && t.startsWith(prefix)) t = t.slice(2);
		if (!t) throw new Error('Empty');
		let n = 0n;
		const B = BigInt(base);
		for (const c of t) {
			const d = DIGITS.indexOf(c);
			if (d < 0 || d >= base) throw new Error(`“${c}” is not a valid base-${base} digit`);
			n = n * B + BigInt(d);
		}
		return neg ? -n : n;
	}

	function format(n: bigint, base: number): string {
		const neg = n < 0n;
		let s = (neg ? -n : n).toString(base);
		if (group) {
			const size = base === 2 ? 4 : base === 16 ? 2 : base === 10 ? 3 : 0;
			if (size) {
				s = s.padStart(base === 10 ? s.length : Math.ceil(s.length / size) * size, '0');
				s = s.replace(new RegExp(`\\B(?=(.{${size}})+$)`, 'g'), base === 10 ? ',' : ' ');
			}
		}
		return (neg ? '-' : '') + s;
	}

	const bases = $derived([
		{ base: 2, label: 'Binary (2)' },
		{ base: 8, label: 'Octal (8)' },
		{ base: 10, label: 'Decimal (10)' },
		{ base: 16, label: 'Hexadecimal (16)' },
		{ base: Math.min(36, Math.max(2, Math.floor(customBase) || 36)), label: 'Custom' }
	]);

	function shown(base: number, i: number): string {
		if (editing === i) return drafts[i] ?? '';
		return value === null ? '' : format(value, base);
	}

	function onInput(i: number, base: number, s: string) {
		drafts[i] = s;
		if (!s.trim()) {
			value = null;
			error = null;
			return;
		}
		try {
			value = parse(s.replace(/,/g, ''), base);
			error = null;
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
		}
	}

	const bits = $derived(value === null ? 0 : (value < 0n ? -value : value).toString(2).length);
</script>

<ToolHeader slug="number-base" />

<div class="max-w-2xl space-y-4">
	<div class="space-y-3">
		{#each bases as b, i (i)}
			<div class="grid gap-1.5">
				<div class="flex items-center justify-between">
					{#if i === 4}
						<div class="flex items-center gap-2">
							<Label for="nb-custom-base" class="label-mono">Base</Label>
							<Input
								id="nb-custom-base"
								class="h-7 w-20"
								type="number"
								min="2"
								max="36"
								bind:value={customBase}
							/>
						</div>
					{:else}
						<Label for="nb-{i}" class="label-mono">{b.label}</Label>
					{/if}
					<CopyButton text={value === null ? '' : format(value, b.base)} />
				</div>
				<Input
					id="nb-{i}"
					class="font-mono"
					spellcheck="false"
					autocomplete="off"
					aria-label={b.label}
					value={shown(b.base, i)}
					onfocus={() => {
						editing = i;
						drafts[i] = value === null ? '' : format(value, b.base);
					}}
					onblur={() => (editing = null)}
					oninput={(e) => onInput(i, b.base, e.currentTarget.value)}
				/>
			</div>
		{/each}
	</div>

	<div class="flex flex-wrap items-center gap-4">
		<div class="flex items-center gap-2">
			<Checkbox id="nb-group" bind:checked={group} />
			<Label for="nb-group" class="text-xs font-normal">Group digits</Label>
		</div>
		{#if value !== null}
			<span class="text-muted-foreground text-xs">{bits} bit{bits === 1 ? '' : 's'}</span>
		{/if}
	</div>

	{#if error}
		<p role="alert" class="text-destructive text-sm">{error}</p>
	{/if}
</div>
