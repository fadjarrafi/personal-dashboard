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

	const borderClass = {
		success: 'border-base-content',
		error: 'border-error text-error',
		info: 'border-base-300'
	} as const;

	const icon = {
		success: '✓',
		error: '✕',
		info: 'ⓘ'
	} as const;
</script>

{#if visible && current}
	<div class="toast toast-bottom toast-center z-50 max-w-full sm:toast-end">
		<!-- daisyUI `.toast` memaksa `white-space: nowrap` + `min-width: fit-content`
		     dan menempel ke tepi kanan. Tanpa batas lebar + izin wrap, pesan yang
		     agak panjang melebar keluar viewport di layar 320-375px. -->
		<div
			role="alert"
			class="flex max-w-[calc(100vw-2rem)] items-center gap-2 whitespace-normal border bg-base-200 px-4 py-3 font-mono text-xs uppercase tracking-widest {borderClass[
				current.kind
			]}"
		>
			<span class="font-bold">{icon[current.kind]}</span>
			<span class="min-w-0 break-words normal-case tracking-normal">{current.msg}</span>
			<button
				type="button"
				class="btn btn-ghost btn-xs rounded-none"
				onclick={() => (visible = false)}
				aria-label="Tutup"
			>
				✕
			</button>
		</div>
	</div>
{/if}
