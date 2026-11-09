<script lang="ts">
	// login-02 block (docs/design.md §Blocks → Login page).
	import LoginForm from '$lib/components/login-form.svelte';
	import { Transition } from '$lib/components/motion';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
</script>

<svelte:head><title>Log in · Dashboard</title></svelte:head>

<div class="grid min-h-svh lg:grid-cols-2">
	<div class="bg-background safe-top safe-bottom flex flex-col gap-4 p-6 md:p-10">
		<div class="flex justify-center gap-2 md:justify-start">
			<a href="/" class="flex items-center gap-2 font-semibold tracking-tight">
				<span class="text-primary" aria-hidden="true">◆</span>
				Dashboard
			</a>
		</div>
		<div class="flex flex-1 items-center justify-center">
			<Transition class="w-full max-w-xs">
				<LoginForm email={form?.email ?? ''} error={form?.error ?? null} />
			</Transition>
		</div>
	</div>
	<!-- Token-only cover panel: no stock imagery, no copy. -->
	<div
		class="relative hidden border-l bg-gradient-to-b from-[var(--ink-black)] to-[var(--black)] lg:block"
		aria-hidden="true"
	></div>
</div>
