<!-- Fade-in when scrolled into view. Allowed for chart entrance only (docs/design.md §Motion). -->
<script lang="ts">
	import { animate, inView } from 'motion';
	import type { Snippet } from 'svelte';
	import { DUR_MED, EASE_OUT, prefersReducedMotion } from './reduced';

	let { children, class: className = '' }: { children: Snippet; class?: string } = $props();

	let el = $state<HTMLDivElement>();

	$effect(() => {
		if (!el || prefersReducedMotion()) return;
		el.style.opacity = '0';
		return inView(
			el,
			(target) => {
				animate(target, { opacity: [0, 1] }, { duration: DUR_MED, ease: EASE_OUT });
			},
			{ amount: 0.2 }
		);
	});
</script>

<div bind:this={el} class={className}>
	{@render children()}
</div>
