<script lang="ts">
	import CopyButton from '$lib/components/CopyButton.svelte';
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
		if (typeof exp !== 'number') return { label: 'No exp', cls: 'badge-ghost' };
		const diff = exp * 1000 - Date.now();
		if (diff < 0) return { label: 'Expired', cls: 'badge-error' };
		const mins = Math.round(diff / 60_000);
		return {
			label: `Valid for ${mins < 120 ? `${mins} more min` : `${Math.round(mins / 60)} more h`}`,
			cls: 'badge-success'
		};
	});
</script>

<ToolHeader slug="jwt" />

<div class="space-y-4">
	<label class="form-control w-full">
		<div class="label py-1"><span class="label-mono">Token</span></div>
		<textarea
			class="textarea textarea-bordered h-28 w-full break-all font-mono text-xs"
			bind:value={token}
			spellcheck="false"
			placeholder="eyJhbGciOi..."
		></textarea>
	</label>
	<p class="text-xs opacity-60">
		Decode only — the signature is <strong>not</strong> verified. The token is not sent anywhere.
	</p>

	{#if decoded && 'error' in decoded}
		<div role="alert" class="alert alert-error rounded-none text-sm">{decoded.error}</div>
	{:else if decoded}
		{#if status}<span class="badge rounded-none {status.cls}">{status.label}</span>{/if}
		<div class="grid gap-4 lg:grid-cols-2">
			{#each [{ label: 'Header', obj: decoded.header }, { label: 'Payload', obj: decoded.payload }] as { label, obj }}
				{@const json = JSON.stringify(obj, null, 2)}
				<section class="space-y-2">
					<div class="flex items-center justify-between">
						<span class="label-mono">{label}</span>
						<CopyButton text={json} />
					</div>
					<pre class="overflow-auto border border-base-300 bg-black p-3 font-mono text-xs">{json}</pre>
				</section>
			{/each}
		</div>
		{@const times = TIME_CLAIMS.filter((k) => typeof decoded.payload[k] === 'number')}
		{#if times.length}
			<dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
				{#each times as k}
					<dt class="font-mono opacity-60">{k}</dt>
					<dd>{fmtClaim(decoded.payload[k])} WIB</dd>
				{/each}
			</dl>
		{/if}
	{/if}
</div>
