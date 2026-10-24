<script lang="ts">
	let {
		text,
		label = 'Copy',
		class: className = 'btn btn-ghost btn-xs rounded-none'
	}: { text: string; label?: string; class?: string } = $props();

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

<button type="button" class={className} onclick={copy} disabled={!text}>
	{copied ? 'Copied' : label}
</button>
