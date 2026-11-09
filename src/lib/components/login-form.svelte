<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button/index.js';
	import { FieldGroup, Field, FieldLabel, FieldError } from '$lib/components/ui/field/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { cn } from '$lib/utils.js';

	// View only — the SvelteKit action in routes/login/+page.server.ts does the work.
	let {
		email = '',
		error = null,
		class: className
	}: { email?: string; error?: string | null; class?: string } = $props();

	const id = $props.id();
	let submitting = $state(false);
</script>

<form
	method="post"
	class={cn('flex flex-col gap-6', className)}
	use:enhance={() => {
		submitting = true;
		return async ({ update }) => {
			await update({ reset: false });
			submitting = false;
		};
	}}
>
	<FieldGroup>
		<div class="flex flex-col gap-1">
			<h1 class="text-2xl font-bold tracking-tight">Log in</h1>
			<p class="text-muted-foreground text-sm text-balance">
				Enter your email and password to open the dashboard.
			</p>
		</div>
		<Field>
			<FieldLabel for="email-{id}">Email</FieldLabel>
			<Input
				id="email-{id}"
				type="email"
				name="email"
				autocomplete="email"
				value={email}
				required
				aria-invalid={error ? true : undefined}
			/>
		</Field>
		<Field>
			<FieldLabel for="password-{id}">Password</FieldLabel>
			<Input
				id="password-{id}"
				type="password"
				name="password"
				autocomplete="current-password"
				required
				aria-invalid={error ? true : undefined}
			/>
		</Field>
		{#if error}
			<FieldError role="alert">{error}</FieldError>
		{/if}
		<Field>
			<Button type="submit" class="tap-target" disabled={submitting}>
				{submitting ? 'Logging in…' : 'Log in'}
			</Button>
		</Field>
	</FieldGroup>
</form>
