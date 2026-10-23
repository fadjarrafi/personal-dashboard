<script lang="ts">
	import ToolHeader from '$lib/components/tools/ToolHeader.svelte';

	const FLAGS = [
		['g', 'global'],
		['i', 'ignore case'],
		['m', 'multiline'],
		['s', 'dotAll'],
		['u', 'unicode']
	] as const;

	let pattern = $state('(\\d{4})-(\\d{2})-(\\d{2})');
	let flags = $state('g');
	let text = $state('Rilis 2025-01-15, patch 2025-02-03.');

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
		<label class="form-control min-w-0 flex-1">
			<div class="label py-1"><span class="label-mono">Pola</span></div>
			<div class="flex items-center border border-base-300 bg-base-100 font-mono">
				<span class="px-2 opacity-50">/</span>
				<input
					class="input input-ghost min-w-0 flex-1 rounded-none px-0 font-mono focus:outline-none"
					bind:value={pattern}
					spellcheck="false"
					aria-label="Pola regex"
				/>
				<span class="px-2 opacity-50">/{flags}</span>
			</div>
		</label>
		<div class="join" role="group" aria-label="Flag">
			{#each FLAGS as [f, title]}
				<button
					type="button"
					class="btn join-item btn-sm rounded-none font-mono {flags.includes(f) ? 'btn-active' : ''}"
					aria-pressed={flags.includes(f)}
					{title}
					onclick={() => toggleFlag(f)}>{f}</button
				>
			{/each}
		</div>
	</div>

	{#if 'error' in result}
		<div role="alert" class="alert alert-error rounded-none text-sm">{result.error}</div>
	{/if}

	<div class="grid gap-4 lg:grid-cols-2">
		<section class="space-y-2">
			<span class="label-mono">Teks uji</span>
			<textarea
				class="textarea textarea-bordered h-56 w-full font-mono text-xs"
				bind:value={text}
				spellcheck="false"
				aria-label="Teks uji"
			></textarea>
			<div
				class="max-h-56 overflow-auto whitespace-pre-wrap break-all border border-base-300 bg-black p-3 font-mono text-xs"
				aria-label="Hasil highlight"
			>
				{#each segments as seg}{#if seg.hit}<mark class="bg-primary/40 text-base-content"
							>{seg.text}</mark
						>{:else}{seg.text}{/if}{/each}
			</div>
		</section>

		<section class="space-y-2">
			<span class="label-mono">
				{'matches' in result ? `${result.matches.length} match` : '—'}
			</span>
			{#if 'matches' in result}
				<ol class="max-h-[30rem] space-y-2 overflow-auto" role="list">
					{#each result.matches as m, i}
						<li class="border border-base-300 p-2 text-xs">
							<div class="flex justify-between gap-2">
								<code class="break-all font-mono">{m[0] || '(kosong)'}</code>
								<span class="shrink-0 opacity-50">#{i + 1} @ {m.index}</span>
							</div>
							{#if m.length > 1 || m.groups}
								<dl class="mt-1 grid grid-cols-[auto_1fr] gap-x-3 font-mono opacity-80">
									{#each m.slice(1) as g, gi}
										<dt class="opacity-60">${gi + 1}</dt>
										<dd class="break-all">{g ?? 'undefined'}</dd>
									{/each}
									{#each Object.entries(m.groups ?? {}) as [name, g]}
										<dt class="opacity-60">&lt;{name}&gt;</dt>
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
