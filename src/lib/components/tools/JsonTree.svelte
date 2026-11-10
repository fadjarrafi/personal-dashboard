<!-- Tree view JSON yang bisa di-collapse; rekursif lewat self-import. -->
<script lang="ts">
	import Self from './JsonTree.svelte';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';

	let {
		value,
		name = null,
		depth = 0,
		expandDepth = 2,
		last = true
	}: {
		value: unknown;
		name?: string | number | null;
		depth?: number;
		expandDepth?: number;
		last?: boolean;
	} = $props();

	const isArr = $derived(Array.isArray(value));
	const isObj = $derived(value !== null && typeof value === 'object');
	const entries = $derived(
		isObj
			? isArr
				? (value as unknown[]).map((v, i) => [i, v] as const)
				: Object.entries(value as object)
			: []
	);
	// svelte-ignore state_referenced_locally
	let open = $state(depth < expandDepth);

	function cls(v: unknown) {
		if (v === null) return 'text-muted-foreground';
		switch (typeof v) {
			case 'string':
				return 'text-success';
			case 'number':
				return 'text-primary';
			case 'boolean':
				return 'text-warning';
			default:
				return '';
		}
	}
</script>

<div class="font-mono text-xs leading-5" style="padding-left: {depth ? 1 : 0}rem">
	{#if isObj}
		<button
			type="button"
			class="hover:bg-accent/50 -ms-4 inline-flex items-center rounded text-left"
			aria-expanded={open}
			onclick={() => (open = !open)}
		>
			<ChevronRight class="size-4 shrink-0 transition-transform {open ? 'rotate-90' : ''}" />
			{#if name !== null}<span class="text-ink-2"
					>{typeof name === 'number' ? name : `"${name}"`}</span
				>:&nbsp;{/if}
			<span>{isArr ? '[' : '{'}</span>
			{#if !open}
				<span class="text-muted-foreground"
					>&nbsp;{entries.length} {isArr ? 'items' : 'keys'}&nbsp;</span
				>
				<span>{isArr ? ']' : '}'}{last ? '' : ','}</span>
			{/if}
		</button>
		{#if open}
			{#each entries as [k, v], i (k)}
				<Self
					value={v}
					name={isArr ? Number(k) : k}
					depth={depth + 1}
					{expandDepth}
					last={i === entries.length - 1}
				/>
			{/each}
			<div>{isArr ? ']' : '}'}{last ? '' : ','}</div>
		{/if}
	{:else}
		<div class="break-all">
			{#if name !== null}<span class="text-ink-2"
					>{typeof name === 'number' ? name : `"${name}"`}</span
				>:&nbsp;{/if}<span class={cls(value)}>{JSON.stringify(value)}</span>{last ? '' : ','}
		</div>
	{/if}
</div>
