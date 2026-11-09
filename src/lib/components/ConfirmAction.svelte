<!--
	POST form whose submit is gated by a shadcn AlertDialog (replaces native
	confirm(), docs/design.md §CTA voice). The form stays a plain POST so the
	CSRF check in hooks.server.ts and the existing SvelteKit actions are unchanged.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import * as AlertDialog from '$lib/components/ui/alert-dialog/index.js';
	import {
		Button,
		buttonVariants,
		type ButtonVariant,
		type ButtonSize
	} from '$lib/components/ui/button/index.js';
	import { cn } from '$lib/utils';

	interface Props {
		action: string;
		/** Hidden inputs posted with the form. */
		fields?: Record<string, string | number>;
		title: string;
		description?: string;
		confirmLabel?: string;
		destructive?: boolean;
		variant?: ButtonVariant;
		size?: ButtonSize;
		class?: string;
		formClass?: string;
		ariaLabel?: string;
		children: Snippet;
	}

	let {
		action,
		fields = {},
		title,
		description,
		confirmLabel = 'Confirm',
		destructive = false,
		variant = 'outline',
		size = 'default',
		class: className,
		formClass,
		ariaLabel,
		children
	}: Props = $props();

	let open = $state(false);
	let formEl = $state<HTMLFormElement>();
</script>

<form method="post" {action} bind:this={formEl} class={formClass}>
	{#each Object.entries(fields) as [name, value] (name)}
		<input type="hidden" {name} {value} />
	{/each}
	<AlertDialog.Root bind:open>
		<AlertDialog.Trigger
			type="button"
			aria-label={ariaLabel}
			class={cn(
				buttonVariants({ variant, size }),
				destructive &&
					'border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive',
				className
			)}
		>
			{@render children()}
		</AlertDialog.Trigger>
		<AlertDialog.Content>
			<AlertDialog.Header>
				<AlertDialog.Title>{title}</AlertDialog.Title>
				{#if description}
					<AlertDialog.Description>{description}</AlertDialog.Description>
				{/if}
			</AlertDialog.Header>
			<AlertDialog.Footer>
				<AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
				<Button
					variant={destructive ? 'destructive' : 'default'}
					onclick={() => {
						open = false;
						formEl?.requestSubmit();
					}}
				>
					{confirmLabel}
				</Button>
			</AlertDialog.Footer>
		</AlertDialog.Content>
	</AlertDialog.Root>
</form>
