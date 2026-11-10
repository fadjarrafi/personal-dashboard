<script lang="ts">
	import ToolHeader from '$lib/components/tools/ToolHeader.svelte';
	import TextInput from '$lib/components/tools/TextInput.svelte';
	import CopyButton from '$lib/components/CopyButton.svelte';
	import { Checkbox } from '$lib/components/ui/checkbox/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { errorMessage } from '$lib/tool-utils';

	let left = $state(
		'{\n  "name": "dashboard",\n  "version": "1.0.0",\n  "tags": ["a", "b"],\n  "db": { "host": "localhost", "port": 5432 }\n}'
	);
	let right = $state(
		'{\n  "name": "dashboard",\n  "version": "1.1.0",\n  "tags": ["a", "c", "d"],\n  "db": { "host": "localhost" },\n  "debug": true\n}'
	);
	let ignoreOrder = $state(false);

	type Change = {
		kind: 'added' | 'removed' | 'changed' | 'type';
		path: string;
		before?: unknown;
		after?: unknown;
	};

	const key = (k: string) => (/^[A-Za-z_$][\w$]*$/.test(k) ? `.${k}` : `[${JSON.stringify(k)}]`);
	const typeOf = (v: unknown) => (v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v);
	const canon = (v: unknown): string =>
		JSON.stringify(v, (_k, x) =>
			x && typeof x === 'object' && !Array.isArray(x)
				? Object.fromEntries(Object.entries(x).sort())
				: x
		);

	function diff(a: unknown, b: unknown, path: string, out: Change[]) {
		const ta = typeOf(a);
		const tb = typeOf(b);
		if (ta !== tb) {
			out.push({ kind: 'type', path, before: a, after: b });
			return;
		}
		if (ta === 'array') {
			const A = a as unknown[];
			const B = b as unknown[];
			if (ignoreOrder) {
				// Bandingkan sebagai multiset: elemen yang tidak punya pasangan → added/removed.
				const pool = B.map(canon);
				const used = new Set<number>();
				A.forEach((x, i) => {
					const c = canon(x);
					const j = pool.findIndex((p, idx) => p === c && !used.has(idx));
					if (j >= 0) used.add(j);
					else out.push({ kind: 'removed', path: `${path}[${i}]`, before: x });
				});
				B.forEach((x, j) => {
					if (!used.has(j)) out.push({ kind: 'added', path: `${path}[${j}]`, after: x });
				});
				return;
			}
			const n = Math.max(A.length, B.length);
			for (let i = 0; i < n; i++) {
				if (i >= A.length) out.push({ kind: 'added', path: `${path}[${i}]`, after: B[i] });
				else if (i >= B.length) out.push({ kind: 'removed', path: `${path}[${i}]`, before: A[i] });
				else diff(A[i], B[i], `${path}[${i}]`, out);
			}
			return;
		}
		if (ta === 'object') {
			const A = a as Record<string, unknown>;
			const B = b as Record<string, unknown>;
			for (const k of new Set([...Object.keys(A), ...Object.keys(B)])) {
				const p = path + key(k);
				if (!(k in B)) out.push({ kind: 'removed', path: p, before: A[k] });
				else if (!(k in A)) out.push({ kind: 'added', path: p, after: B[k] });
				else diff(A[k], B[k], p, out);
			}
			return;
		}
		if (a !== b) out.push({ kind: 'changed', path, before: a, after: b });
	}

	const result = $derived.by((): { changes: Change[]; error: string | null } => {
		let a: unknown, b: unknown;
		try {
			a = JSON.parse(left);
		} catch (e) {
			return { changes: [], error: `Left: ${errorMessage(e)}` };
		}
		try {
			b = JSON.parse(right);
		} catch (e) {
			return { changes: [], error: `Right: ${errorMessage(e)}` };
		}
		const changes: Change[] = [];
		diff(a, b, '$', changes);
		return { changes, error: null };
	});

	const counts = $derived(
		result.changes.reduce((acc, c) => (acc[c.kind === 'type' ? 'changed' : c.kind]++, acc), {
			added: 0,
			removed: 0,
			changed: 0
		})
	);

	const show = (v: unknown) => {
		const s = JSON.stringify(v);
		return s && s.length > 120 ? s.slice(0, 120) + '…' : s;
	};

	const report = $derived(
		result.changes
			.map((c) =>
				c.kind === 'added'
					? `+ ${c.path}: ${JSON.stringify(c.after)}`
					: c.kind === 'removed'
						? `- ${c.path}: ${JSON.stringify(c.before)}`
						: `~ ${c.path}: ${JSON.stringify(c.before)} → ${JSON.stringify(c.after)}`
			)
			.join('\n')
	);
</script>

<ToolHeader slug="json-diff" />

<div class="space-y-4">
	<div class="grid gap-4 lg:grid-cols-2">
		<TextInput bind:value={left} label="Original (left)" height="h-64" />
		<TextInput bind:value={right} label="Modified (right)" height="h-64" />
	</div>

	<div class="flex flex-wrap items-center gap-3">
		<div class="flex items-center gap-2">
			<Checkbox id="jd-order" bind:checked={ignoreOrder} />
			<Label for="jd-order" class="text-xs font-normal">Ignore array order</Label>
		</div>
		{#if !result.error}
			<Badge variant="outline" class="border-success/40 text-success">+{counts.added} added</Badge>
			<Badge variant="outline" class="border-destructive/40 text-destructive"
				>−{counts.removed} removed</Badge
			>
			<Badge variant="outline" class="border-warning/40 text-warning"
				>~{counts.changed} changed</Badge
			>
			<CopyButton text={report} label="Copy report" variant="outline" size="sm" class="ms-auto" />
		{/if}
	</div>

	{#if result.error}
		<p role="alert" class="border-destructive/40 text-destructive rounded-md border p-3 text-sm">
			{result.error}
		</p>
	{:else if !result.changes.length}
		<p class="text-success text-sm">✓ The documents are structurally identical.</p>
	{:else}
		<ul class="bg-card divide-y rounded-lg border font-mono text-xs" role="list">
			{#each result.changes as c, i (i)}
				<li class="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-3 py-1.5">
					<span
						class="w-4 shrink-0 font-bold {c.kind === 'added'
							? 'text-success'
							: c.kind === 'removed'
								? 'text-destructive'
								: 'text-warning'}"
						>{c.kind === 'added' ? '+' : c.kind === 'removed' ? '−' : '~'}</span
					>
					<span class="text-ink-2 break-all">{c.path}</span>
					<span class="min-w-0 flex-1 break-all">
						{#if c.kind === 'added'}<span class="text-success">{show(c.after)}</span>
						{:else if c.kind === 'removed'}<span class="text-destructive line-through"
								>{show(c.before)}</span
							>
						{:else}
							<span class="text-destructive line-through">{show(c.before)}</span>
							→ <span class="text-success">{show(c.after)}</span>
							{#if c.kind === 'type'}<span class="text-muted-foreground">(type changed)</span>{/if}
						{/if}
					</span>
				</li>
			{/each}
		</ul>
	{/if}
</div>
