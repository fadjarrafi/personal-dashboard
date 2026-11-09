<script lang="ts">
	import { Button, type ButtonSize, type ButtonVariant } from '$lib/components/ui/button/index.js';
	import Copy from '@lucide/svelte/icons/copy';
	import Check from '@lucide/svelte/icons/check';

	let {
		text,
		label = 'Copy',
		variant = 'ghost',
		size = 'xs',
		class: className = ''
	}: {
		text: string;
		label?: string;
		variant?: ButtonVariant;
		size?: ButtonSize;
		class?: string;
	} = $props();

	let copied = $state(false);

	async function copy() {
		try {
			await navigator.clipboard.writeText(text);
			copied = true;
			setTimeout(() => (copied = false), 1200);
		} catch {
			// ignore
		}
	}
</script>

<Button type="button" {variant} {size} class={className} onclick={copy} disabled={!text}>
	{#if copied}<Check />Copied{:else}<Copy />{label}{/if}
</Button>
