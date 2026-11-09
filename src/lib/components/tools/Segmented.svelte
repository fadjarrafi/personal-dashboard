<!-- Single-choice segmented control (shadcn ToggleGroup) that never deselects. -->
<script lang="ts" generics="T extends string">
	import * as ToggleGroup from '$lib/components/ui/toggle-group/index.js';

	let {
		value = $bindable(),
		options,
		ariaLabel,
		onchange,
		class: className = ''
	}: {
		value: T;
		options: readonly (T | { value: T; label: string })[];
		ariaLabel: string;
		/** Called after the user picks a different option. */
		onchange?: (value: T) => void;
		class?: string;
	} = $props();

	const normalized = $derived(
		options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o))
	);
</script>

<ToggleGroup.Root
	type="single"
	variant="outline"
	size="sm"
	class={className}
	aria-label={ariaLabel}
	bind:value={
		() => value,
		(v) => {
			// Clicking the active item would clear the value — keep one always selected.
			if (!v || v === value) return;
			value = v as T;
			onchange?.(value);
		}
	}
>
	{#each normalized as o (o.value)}
		<ToggleGroup.Item value={o.value} class="px-3">{o.label}</ToggleGroup.Item>
	{/each}
</ToggleGroup.Root>
