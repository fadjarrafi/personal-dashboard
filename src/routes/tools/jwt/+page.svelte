<script lang="ts">
	import CopyButton from '$lib/components/CopyButton.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import ToolHeader from '$lib/components/tools/ToolHeader.svelte';

	let token = $state('');

	function decodePart(part: string): unknown {
		const b64 = part.replace(/-/g, '+').replace(/_/g, '/');
		const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
		const bytes = Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
		return JSON.parse(new TextDecoder().decode(bytes));
	}

	const decoded = $derived.by(() => {
		const t = token.trim().replace(/^Bearer\s+/i, '');
		if (!t) return null;
		const parts = t.split('.');
		if (parts.length !== 3) return { error: 'A JWT must have 3 dot-separated parts.' };
		try {
			return {
				header: decodePart(parts[0]) as Record<string, unknown>,
				payload: decodePart(parts[1]) as Record<string, unknown>,
				signature: parts[2]
			};
		} catch (e) {
			return { error: `Failed to decode: ${e instanceof Error ? e.message : e}` };
		}
	});

	const TIME_CLAIMS = ['exp', 'iat', 'nbf', 'auth_time'];

	function fmtClaim(v: unknown): string {
		if (typeof v !== 'number') return '';
		return new Date(v * 1000).toLocaleString('en-GB', { timeZone: 'Asia/Jakarta' });
	}

	const status = $derived.by(() => {
		if (!decoded || 'error' in decoded) return null;
		const exp = decoded.payload.exp;
		if (typeof exp !== 'number')
			return { label: 'No exp', cls: 'border-border text-muted-foreground' };
		const diff = exp * 1000 - Date.now();
		if (diff < 0) return { label: 'Expired', cls: 'border-destructive/40 text-destructive' };
		const mins = Math.round(diff / 60_000);
		return {
			label: `Valid for ${mins < 120 ? `${mins} more min` : `${Math.round(mins / 60)} more h`}`,
			cls: 'border-success/40 text-success'
		};
	});
</script>

<ToolHeader slug="jwt" />

<div class="space-y-4">
	<div class="grid gap-1.5">
		<Label for="jwt-token" class="label-mono">Token</Label>
		<Textarea
			id="jwt-token"
			class="bg-well h-28 font-mono text-xs break-all"
			bind:value={token}
			spellcheck="false"
			placeholder="eyJhbGciOi..."
		/>
	</div>
	<p class="text-muted-foreground text-xs">
		Decode only — the signature is <strong class="text-foreground">not</strong> verified. The token is
		not sent anywhere.
	</p>

	{#if decoded && 'error' in decoded}
		<p role="alert" class="border-destructive/40 text-destructive rounded-md border p-3 text-sm">
			{decoded.error}
		</p>
	{:else if decoded}
		{#if status}<Badge variant="outline" class={status.cls}>{status.label}</Badge>{/if}
		<div class="grid gap-4 lg:grid-cols-2">
			{#each [{ label: 'Header', obj: decoded.header }, { label: 'Payload', obj: decoded.payload }] as { label, obj } (label)}
				{@const json = JSON.stringify(obj, null, 2)}
				<section class="space-y-2">
					<div class="flex items-center justify-between">
						<span class="label-mono">{label}</span>
						<CopyButton text={json} />
					</div>
					<pre class="bg-well overflow-auto rounded-md border p-3 font-mono text-xs">{json}</pre>
				</section>
			{/each}
		</div>
		{@const times = TIME_CLAIMS.filter((k) => typeof decoded.payload[k] === 'number')}
		{#if times.length}
			<dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
				{#each times as k (k)}
					<dt class="text-muted-foreground font-mono">{k}</dt>
					<dd>{fmtClaim(decoded.payload[k])} WIB</dd>
				{/each}
			</dl>
		{/if}
	{/if}
</div>
