<script lang="ts">
	import bcrypt from 'bcryptjs';
	import ToolHeader from '$lib/components/tools/ToolHeader.svelte';
	import CopyButton from '$lib/components/CopyButton.svelte';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Spinner } from '$lib/components/ui/spinner/index.js';
	import { errorMessage } from '$lib/tool-utils';

	let password = $state('');
	let rounds = $state(10);
	let hash = $state('');
	let hashing = $state(false);
	let elapsed = $state(0);

	let verifyPassword = $state('');
	let verifyHash = $state('');
	let verifyResult = $state<boolean | null>(null);
	let verifyError = $state<string | null>(null);
	let verifying = $state(false);

	const cost = $derived(Math.min(Math.max(Math.floor(rounds) || 10, 4), 15));
	// bcrypt hanya memakai 72 byte pertama dari password.
	const tooLong = $derived(new TextEncoder().encode(password).length > 72);

	async function generate() {
		hashing = true;
		const t0 = performance.now();
		try {
			hash = await bcrypt.hash(password, cost);
			elapsed = performance.now() - t0;
		} finally {
			hashing = false;
		}
	}

	async function verify() {
		verifying = true;
		verifyError = null;
		verifyResult = null;
		try {
			if (!/^\$2[abxy]?\$\d{2}\$[./A-Za-z0-9]{53}$/.test(verifyHash.trim()))
				throw new Error('Not a valid bcrypt hash ($2a$/$2b$/$2y$, 60 chars).');
			verifyResult = await bcrypt.compare(verifyPassword, verifyHash.trim());
		} catch (e) {
			verifyError = errorMessage(e);
		} finally {
			verifying = false;
		}
	}

	const info = $derived.by(() => {
		const m = verifyHash.trim().match(/^\$(2[abxy]?)\$(\d{2})\$(.{22})(.{31})$/);
		return m ? { version: m[1], cost: Number(m[2]), salt: m[3], digest: m[4] } : null;
	});
</script>

<ToolHeader slug="bcrypt" />

<div class="grid gap-8 lg:grid-cols-2">
	<section class="space-y-3">
		<h2 class="label-mono">Generate hash</h2>
		<div class="grid gap-1.5">
			<Label for="bc-pw" class="text-xs">Password</Label>
			<Input
				id="bc-pw"
				class="font-mono"
				bind:value={password}
				autocomplete="off"
				spellcheck="false"
			/>
			{#if tooLong}<p class="text-warning text-xs">
					bcrypt ignores everything after the first 72 bytes.
				</p>{/if}
		</div>
		<div class="flex items-end gap-3">
			<div class="grid gap-1.5">
				<Label for="bc-rounds" class="text-xs"
					>Cost factor: {cost} ({(2 ** cost).toLocaleString()} rounds)</Label
				>
				<input
					id="bc-rounds"
					type="range"
					min="4"
					max="15"
					bind:value={rounds}
					class="accent-primary w-56"
				/>
			</div>
			<Button size="sm" onclick={generate} disabled={hashing}
				>{#if hashing}<Spinner />{/if}Hash</Button
			>
		</div>
		{#if hash}
			<div class="bg-card flex items-center gap-2 rounded-lg border px-3 py-2">
				<code class="min-w-0 flex-1 font-mono text-xs break-all">{hash}</code>
				<CopyButton text={hash} />
			</div>
			<p class="text-muted-foreground text-xs">
				Took {Math.round(elapsed)} ms. A new random salt is used every time.
			</p>
		{/if}
	</section>

	<section class="space-y-3">
		<h2 class="label-mono">Verify</h2>
		<div class="grid gap-1.5">
			<Label for="bc-vpw" class="text-xs">Password</Label>
			<Input
				id="bc-vpw"
				class="font-mono"
				bind:value={verifyPassword}
				autocomplete="off"
				spellcheck="false"
			/>
		</div>
		<div class="grid gap-1.5">
			<Label for="bc-vhash" class="text-xs">Hash</Label>
			<Input
				id="bc-vhash"
				class="font-mono"
				bind:value={verifyHash}
				placeholder="$2b$10$…"
				spellcheck="false"
			/>
		</div>
		<Button size="sm" variant="outline" onclick={verify} disabled={verifying || !verifyHash}
			>{#if verifying}<Spinner />{/if}Verify</Button
		>
		{#if verifyError}
			<p role="alert" class="text-destructive text-sm">{verifyError}</p>
		{:else if verifyResult !== null}
			<p class="text-sm {verifyResult ? 'text-success' : 'text-destructive'}" role="status">
				{verifyResult ? '✓ Password matches the hash' : '✕ Password does not match'}
			</p>
		{/if}
		{#if info}
			<dl
				class="bg-card grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 rounded-lg border px-3 py-2 text-xs"
			>
				<dt class="label-mono">version</dt>
				<dd class="font-mono">${info.version}$</dd>
				<dt class="label-mono">cost</dt>
				<dd class="font-mono">{info.cost}</dd>
				<dt class="label-mono">salt</dt>
				<dd class="font-mono break-all">{info.salt}</dd>
				<dt class="label-mono">digest</dt>
				<dd class="font-mono break-all">{info.digest}</dd>
			</dl>
		{/if}
	</section>
</div>
