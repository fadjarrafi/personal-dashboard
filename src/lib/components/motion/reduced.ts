// motion's vanilla `animate()` does not honour prefers-reduced-motion on its own
// (docs/design.md §Motion), so every wrapper checks this first.
export function prefersReducedMotion(): boolean {
	return (
		typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
	);
}

// Design-token easings/durations as motion options (seconds).
export const EASE_OUT = [0.16, 1, 0.3, 1] as const;
export const EASE_IN_OUT = [0.65, 0, 0.35, 1] as const;
export const DUR_SHORT = 0.16;
export const DUR_MED = 0.22;
