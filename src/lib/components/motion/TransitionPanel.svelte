<!-- Cross-fade + small slide when `key` changes — tab panels, filter-switched lists. -->
<script lang="ts">
	import { animate } from 'motion';
	import type { Snippet } from 'svelte';
	import { DUR_MED, EASE_IN_OUT, prefersReducedMotion } from './reduced';

	let {
		key,
		children,
		class: className = ''
	}: { key: unknown; children: Snippet; class?: string } = $props();

	let el = $state<HTMLDivElement>();
	let first = true;

	$effect(() => {
		void key;
		if (!el) return;
		if (first) {
			first = false;
			return;
		}
		if (prefersReducedMotion()) return;
		const controls = animate(
			el,
			{ opacity: [0, 1], transform: ['translateY(6px)', 'translateY(0)'] },
			{ duration: DUR_MED, ease: EASE_IN_OUT }
		);
		return () => controls.stop();
	});
</script>

<div bind:this={el} class={className}>
	{@render children()}
</div>
