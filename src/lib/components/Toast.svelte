<script lang="ts">
	// Flash cookie → Sonner toast. Silent-success stance (docs/design.md):
	// short, bottom-right, auto-dismiss.
	import { toast } from 'svelte-sonner';
	import { Toaster } from '$lib/components/ui/sonner/index.js';
	import type { Flash } from '$lib/server/flash';

	let { flash }: { flash: Flash | null | undefined } = $props();

	$effect(() => {
		if (!flash?.msg) return;
		if (flash.kind === 'error') toast.error(flash.msg);
		else if (flash.kind === 'success') toast.success(flash.msg);
		else toast.info(flash.msg);
	});
</script>

<Toaster position="bottom-right" duration={3000} closeButton />
