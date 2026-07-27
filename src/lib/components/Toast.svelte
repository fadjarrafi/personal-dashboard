<script lang="ts">
	import type { Flash } from '$lib/server/flash';

	let { flash }: { flash: Flash | null | undefined } = $props();

	let visible = $state(false);
	let current = $state<Flash | null>(null);
	let timer: ReturnType<typeof setTimeout> | null = null;

	$effect(() => {
		if (flash && flash.msg) {
			current = flash;
			visible = true;
			if (timer) clearTimeout(timer);
			timer = setTimeout(() => (visible = false), 3000);
		}
	});

	const alertClass = {
		success: 'alert-success',
		error: 'alert-error',
		info: 'alert-info'
	} as const;

	const icon = {
		success: '✓',
		error: '✕',
		info: 'ⓘ'
	} as const;
</script>

{#if visible && current}
	<div class="toast toast-top toast-end z-50">
		<div role="alert" class="alert {alertClass[current.kind]} shadow-lg">
			<span class="text-lg font-bold">{icon[current.kind]}</span>
			<span>{current.msg}</span>
			<button
				type="button"
				class="btn btn-ghost btn-xs"
				onclick={() => (visible = false)}
				aria-label="Tutup"
			>
				✕
			</button>
		</div>
	</div>
{/if}
