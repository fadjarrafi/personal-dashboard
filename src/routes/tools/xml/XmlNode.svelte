<script lang="ts">
	import Self from './XmlNode.svelte';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';

	let { node, depth = 0 }: { node: Element; depth?: number } = $props();

	const children = $derived([...node.children]);
	const text = $derived(
		[...node.childNodes]
			.filter((n) => n.nodeType === Node.TEXT_NODE || n.nodeType === Node.CDATA_SECTION_NODE)
			.map((n) => n.textContent)
			.join('')
			.trim()
	);
	// svelte-ignore state_referenced_locally
	let open = $state(depth < 3);
</script>

<div class="font-mono text-xs leading-5" style="padding-left: {depth ? 1 : 0}rem">
	<button
		type="button"
		class="hover:bg-accent/50 -ms-4 inline-flex max-w-full items-start rounded text-left {children.length
			? ''
			: 'cursor-default'}"
		aria-expanded={children.length ? open : undefined}
		onclick={() => children.length && (open = !open)}
	>
		<ChevronRight
			class="mt-0.5 size-4 shrink-0 transition-transform {open ? 'rotate-90' : ''} {children.length
				? ''
				: 'invisible'}"
		/>
		<span class="break-all">
			<span class="text-primary">&lt;{node.tagName}</span>{#each node.attributes as a (a.name)}
				<span class="text-ink-2"> {a.name}</span>=<span class="text-success">"{a.value}"</span
				>{/each}<span class="text-primary">&gt;</span>
			{#if text && (!children.length || !open)}<span
					>{text.length > 80 ? text.slice(0, 80) + '…' : text}</span
				>{/if}
			{#if children.length && !open}<span class="text-muted-foreground">
					{children.length} children</span
				>{/if}
		</span>
	</button>
	{#if open}
		{#each children as child, i (i)}
			<Self node={child} depth={depth + 1} />
		{/each}
	{/if}
</div>
