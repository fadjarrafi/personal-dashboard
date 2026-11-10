<script lang="ts">
	import semver from 'semver';
	import ToolHeader from '$lib/components/tools/ToolHeader.svelte';
	import CopyButton from '$lib/components/CopyButton.svelte';
	import TextInput from '$lib/components/tools/TextInput.svelte';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';

	let version = $state('1.4.2-beta.1+build.7');
	let other = $state('1.5.0');
	let preid = $state('beta');
	let range = $state('^1.4.0 || ~2.0.0');
	let list = $state('1.3.9\n1.4.0\n1.4.2-beta.1\n1.9.3\n2.0.0\n2.0.5\n2.1.0');

	const parsed = $derived(semver.parse(version.trim(), { loose: true }));
	const otherParsed = $derived(semver.valid(other.trim(), { loose: true }));

	const BUMPS = [
		'major',
		'minor',
		'patch',
		'premajor',
		'preminor',
		'prepatch',
		'prerelease'
	] as const;
	const bumps = $derived(
		parsed
			? BUMPS.map(
					(b) =>
						[
							b,
							(preid ? semver.inc(parsed.version, b, preid) : semver.inc(parsed.version, b)) ?? '—'
						] as const
				)
			: []
	);

	const cmp = $derived.by(() => {
		if (!parsed || !otherParsed) return null;
		const c = semver.compare(parsed.version, otherParsed);
		return {
			symbol: c < 0 ? '<' : c > 0 ? '>' : '=',
			diff: semver.diff(parsed.version, otherParsed)
		};
	});

	const validRange = $derived(semver.validRange(range.trim(), { loose: true }));
	const versions = $derived(
		list
			.split(/[\s,]+/)
			.map((v) => v.trim())
			.filter(Boolean)
	);
	const matches = $derived(
		validRange
			? versions.map((v) => ({
					v,
					ok:
						!!semver.valid(v, { loose: true }) &&
						semver.satisfies(v, validRange, { includePrerelease: false, loose: true })
				}))
			: []
	);
	const maxSat = $derived(
		validRange
			? semver.maxSatisfying(
					versions.filter((v) => semver.valid(v, { loose: true })),
					validRange
				)
			: null
	);
	const minSat = $derived(
		validRange
			? semver.minSatisfying(
					versions.filter((v) => semver.valid(v, { loose: true })),
					validRange
				)
			: null
	);
	const sorted = $derived(
		semver.sort(versions.filter((v) => semver.valid(v, { loose: true }))).join(', ')
	);
</script>

<ToolHeader slug="semver" />

<div class="grid gap-6 lg:grid-cols-2">
	<section class="space-y-3">
		<h2 class="label-mono">Parse & bump</h2>
		<Input class="font-mono" bind:value={version} aria-label="Version" spellcheck="false" />
		{#if !parsed}
			<p role="alert" class="text-destructive text-sm">Not a valid semantic version.</p>
		{:else}
			<dl
				class="bg-card grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 rounded-lg border px-3 py-2 text-xs"
			>
				<dt class="label-mono">major</dt>
				<dd class="font-mono">{parsed.major}</dd>
				<dt class="label-mono">minor</dt>
				<dd class="font-mono">{parsed.minor}</dd>
				<dt class="label-mono">patch</dt>
				<dd class="font-mono">{parsed.patch}</dd>
				<dt class="label-mono">prerelease</dt>
				<dd class="font-mono">{parsed.prerelease.join('.') || '—'}</dd>
				<dt class="label-mono">build</dt>
				<dd class="font-mono">{parsed.build.join('.') || '—'}</dd>
				<dt class="label-mono">normalized</dt>
				<dd class="font-mono">{parsed.version}</dd>
			</dl>
			<div class="grid w-40 gap-1.5">
				<Label for="sv-preid" class="text-xs">Prerelease id</Label>
				<Input id="sv-preid" class="h-8 font-mono" bind:value={preid} />
			</div>
			<ul class="bg-card divide-y rounded-lg border" role="list">
				{#each bumps as [kind, v] (kind)}
					<li class="flex items-center gap-3 px-3 py-1">
						<span class="label-mono w-24">{kind}</span>
						<code class="flex-1 font-mono text-xs">{v}</code>
						<CopyButton text={v} />
					</li>
				{/each}
			</ul>
		{/if}

		<h2 class="label-mono pt-2">Compare</h2>
		<div class="flex items-center gap-2">
			<code class="font-mono text-sm">{parsed?.version ?? '?'}</code>
			<span class="text-lg font-semibold">{cmp?.symbol ?? '?'}</span>
			<Input class="h-8 flex-1 font-mono" bind:value={other} aria-label="Compare with version" />
		</div>
		{#if cmp}
			<p class="text-muted-foreground text-xs">Difference: <strong>{cmp.diff ?? 'none'}</strong></p>
		{:else if other.trim()}
			<p class="text-destructive text-xs">Enter two valid versions to compare.</p>
		{/if}
	</section>

	<section class="space-y-3">
		<h2 class="label-mono">Range check</h2>
		<Input class="font-mono" bind:value={range} aria-label="Range" spellcheck="false" />
		{#if validRange}
			<p class="text-muted-foreground text-xs">
				Normalized: <code class="font-mono">{validRange}</code>
			</p>
		{:else}
			<p role="alert" class="text-destructive text-sm">Invalid range.</p>
		{/if}
		<TextInput bind:value={list} label="Versions (one per line)" height="h-40" />
		{#if validRange}
			<div class="flex flex-wrap gap-1.5">
				{#each matches as m, i (i)}
					<Badge
						variant="outline"
						class={m.ok ? 'border-success/40 text-success' : 'text-muted-foreground line-through'}
						>{m.v}</Badge
					>
				{/each}
			</div>
			<dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs">
				<dt class="label-mono">max satisfying</dt>
				<dd class="font-mono">{maxSat ?? '—'}</dd>
				<dt class="label-mono">min satisfying</dt>
				<dd class="font-mono">{minSat ?? '—'}</dd>
				<dt class="label-mono">sorted</dt>
				<dd class="font-mono break-all">{sorted || '—'}</dd>
			</dl>
		{/if}
	</section>
</div>
