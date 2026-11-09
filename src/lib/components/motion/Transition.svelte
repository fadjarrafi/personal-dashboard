<!-- Fade + small slide-y enter for cards, dialogs and panels (Motion Primitives "Transition"). -->
<script lang="ts">
	import { animate } from 'motion';
	import type { Snippet } from 'svelte';
	import { DUR_MED, EASE_OUT, prefersReducedMotion } from './reduced';

	let {
		children,
		y = 8,
		delay = 0,
		class: className = ''
	}: { children: Snippet; y?: number; delay?: number; class?: string } = $props();

	let el = $state<HTMLDivElement>();

	$effect(() => {
		if (!el || prefersReducedMotion()) return;
		const controls = animate(
			el,
			{ opacity: [0, 1], transform: [`translateY(${y}px)`, 'translateY(0)'] },
			{ duration: DUR_MED, ease: EASE_OUT, delay }
		);
		return () => controls.stop();
	});
</script>

<div bind:this={el} class={className}>
	{@render children()}
</div>
