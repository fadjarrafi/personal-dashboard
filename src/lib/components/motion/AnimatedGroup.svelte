<!-- Short stagger for list children on first render (≤30ms/item, first 8 items only). -->
<script lang="ts">
	import { animate, stagger } from 'motion';
	import type { Snippet } from 'svelte';
	import { DUR_MED, EASE_OUT, prefersReducedMotion } from './reduced';

	let {
		children,
		class: className = '',
		max = 8
	}: { children: Snippet; class?: string; max?: number } = $props();

	let el = $state<HTMLDivElement>();

	$effect(() => {
		if (!el || prefersReducedMotion()) return;
		const items = Array.from(el.children).slice(0, max) as HTMLElement[];
		if (items.length === 0) return;
		const controls = animate(
			items,
			{ opacity: [0, 1], transform: ['translateY(6px)', 'translateY(0)'] },
			{ duration: DUR_MED, ease: EASE_OUT, delay: stagger(0.03) }
		);
		return () => controls.stop();
	});
</script>

<div bind:this={el} class={className}>
	{@render children()}
</div>
