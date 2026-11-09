<script lang="ts">
	import ToolHeader from '$lib/components/tools/ToolHeader.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { Toggle } from '$lib/components/ui/toggle/index.js';

	const FLAGS = [
		['g', 'global'],
		['i', 'ignore case'],
		['m', 'multiline'],
		['s', 'dotAll'],
		['u', 'unicode']
	] as const;

	let pattern = $state('(\\d{4})-(\\d{2})-(\\d{2})');
	let flags = $state('g');
	let text = $state('Release 2025-01-15, patch 2025-02-03.');

	const MAX_MATCHES = 1000;

	function toggleFlag(f: string) {
		flags = flags.includes(f) ? flags.replace(f, '') : flags + f;
	}

	type Result = { matches: RegExpMatchArray[] } | { error: string };

	const result = $derived.by((): Result => {
		if (!pattern) return { matches: [] };
		let re: RegExp;
		try {
			// Selalu pakai 'g' untuk matchAll; flag 'g' user hanya memengaruhi tampilan (semua vs pertama).
			re = new RegExp(pattern, flags.includes('g') ? flags : flags + 'g');
		} catch (e) {
			return { error: e instanceof Error ? e.message : String(e) };
		}
		const matches: RegExpMatchArray[] = [];
		for (const m of text.matchAll(re)) {
			matches.push(m);
			if (!flags.includes('g') || matches.length >= MAX_MATCHES) break;
		}
		return { matches };
	});

	// Potong teks menjadi segmen biasa / match untuk di-highlight.
	const segments = $derived.by(() => {
		if (!('matches' in result) || !result.matches.length) return [{ text, hit: false }];
		const out: Array<{ text: string; hit: boolean }> = [];
		let last = 0;
		for (const m of result.matches) {
			const start = m.index ?? 0;
			if (start > last) out.push({ text: text.slice(last, start), hit: false });
			if (m[0]) out.push({ text: m[0], hit: true });
			last = start + m[0].length;
		}
		if (last < text.length) out.push({ text: text.slice(last), hit: false });
		return out;
	});
</script>

<ToolHeader slug="regex" />

<div class="space-y-4">
	<div class="flex flex-wrap items-end gap-3">
		<div class="grid min-w-0 flex-1 gap-1.5">
			<Label for="regex-pattern" class="label-mono">Pattern</Label>
			<div
				class="border-input bg-well focus-within:border-ring focus-within:ring-ring/50 flex h-9 items-center rounded-md border font-mono focus-within:ring-3"
			>
				<span class="text-muted-foreground px-2">/</span>
				<input
					id="regex-pattern"
					class="min-w-0 flex-1 bg-transparent text-sm outline-none focus-visible:outline-none"
					bind:value={pattern}
					spellcheck="false"
					aria-label="Regex pattern"
				/>
				<span class="text-muted-foreground px-2">/{flags}</span>
			</div>
		</div>
		<div class="flex gap-1" role="group" aria-label="Flag">
			{#each FLAGS as [f, title] (f)}
				<Toggle
					variant="outline"
					size="sm"
					class="font-mono"
					pressed={flags.includes(f)}
					onPressedChange={() => toggleFlag(f)}
					{title}
					aria-label={title}>{f}</Toggle
				>
			{/each}
		</div>
	</div>

	{#if 'error' in result}
		<p role="alert" class="border-destructive/40 text-destructive rounded-md border p-3 text-sm">
			{result.error}
		</p>
	{/if}

	<div class="grid gap-4 lg:grid-cols-2">
		<section class="space-y-2">
			<span class="label-mono">Test text</span>
			<Textarea
				class="bg-well h-56 font-mono text-xs"
				bind:value={text}
				spellcheck="false"
				aria-label="Test text"
			/>
			<div
				class="bg-well max-h-56 overflow-auto rounded-md border p-3 font-mono text-xs break-all whitespace-pre-wrap"
				aria-label="Highlighted result"
			>
				{#each segments as seg, i (i)}{#if seg.hit}<mark
							class="bg-primary/35 text-foreground rounded-xs">{seg.text}</mark
						>{:else}{seg.text}{/if}{/each}
			</div>
		</section>

		<section class="space-y-2">
			<span class="label-mono">
				{'matches' in result ? `${result.matches.length} match` : '—'}
			</span>
			{#if 'matches' in result}
				<ol class="max-h-[30rem] space-y-2 overflow-auto" role="list">
					{#each result.matches as m, i (i)}
						<li class="bg-card rounded-md border p-2 text-xs">
							<div class="flex justify-between gap-2">
								<code class="font-mono break-all">{m[0] || '(empty)'}</code>
								<span class="text-muted-foreground shrink-0">#{i + 1} @ {m.index}</span>
							</div>
							{#if m.length > 1 || m.groups}
								<dl class="mt-1 grid grid-cols-[auto_1fr] gap-x-3 font-mono">
									{#each m.slice(1) as g, gi (gi)}
										<dt class="text-muted-foreground">${gi + 1}</dt>
										<dd class="break-all">{g ?? 'undefined'}</dd>
									{/each}
									{#each Object.entries(m.groups ?? {}) as [name, g] (name)}
										<dt class="text-muted-foreground">&lt;{name}&gt;</dt>
										<dd class="break-all">{g ?? 'undefined'}</dd>
									{/each}
								</dl>
							{/if}
						</li>
					{/each}
				</ol>
			{/if}
		</section>
	</div>
</div>
