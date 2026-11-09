<!-- Tweens a number when it changes (spend totals, stat tiles). -->
<script lang="ts">
	import { animate } from 'motion';
	import { DUR_MED, EASE_OUT, prefersReducedMotion } from './reduced';

	let {
		value,
		format = (n: number) => Math.round(n).toLocaleString('id-ID')
	}: { value: number; format?: (n: number) => string } = $props();

	// SSR and first paint show the real value; only later changes animate.
	let shown = $state<number | null>(null);
	const prev = { v: null as number | null };

	$effect(() => {
		const to = value;
		const from = prev.v;
		prev.v = to;
		if (from === null || from === to || prefersReducedMotion()) {
			shown = to;
			return;
		}
		const controls = animate(from, to, {
			duration: DUR_MED * 2,
			ease: EASE_OUT,
			onUpdate: (v) => (shown = v)
		});
		return () => controls.stop();
	});
</script>

<span class="tabular-nums">{format(shown ?? value)}</span>
