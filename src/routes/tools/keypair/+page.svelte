<script lang="ts">
	import ToolHeader from '$lib/components/tools/ToolHeader.svelte';
	import Segmented from '$lib/components/tools/Segmented.svelte';
	import Output from '$lib/components/tools/Output.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { NativeSelect } from '$lib/components/ui/native-select/index.js';
	import { Spinner } from '$lib/components/ui/spinner/index.js';
	import KeyRound from '@lucide/svelte/icons/key-round';
	import { bytesToBase64, bytesToHex, errorMessage } from '$lib/tool-utils';

	type Algo =
		'RSA-OAEP' | 'RSASSA-PKCS1-v1_5' | 'RSA-PSS' | 'ECDSA' | 'ECDH' | 'Ed25519' | 'X25519';

	const ALGOS: Array<[Algo, string]> = [
		['RSASSA-PKCS1-v1_5', 'RSA · signing (RS256)'],
		['RSA-PSS', 'RSA-PSS · signing (PS256)'],
		['RSA-OAEP', 'RSA-OAEP · encryption'],
		['ECDSA', 'ECDSA · signing (ES256/384/512)'],
		['ECDH', 'ECDH · key agreement'],
		['Ed25519', 'Ed25519 · signing (EdDSA)'],
		['X25519', 'X25519 · key agreement']
	];

	let algo = $state<Algo>('Ed25519');
	let modulus = $state(2048);
	let curve = $state<'P-256' | 'P-384' | 'P-521'>('P-256');
	let format = $state<'pem' | 'jwk'>('pem');
	let busy = $state(false);
	let error = $state<string | null>(null);
	let keys = $state<{
		pubPem: string;
		privPem: string;
		pubJwk: string;
		privJwk: string;
		fingerprint: string;
		ssh: string | null;
	} | null>(null);

	const isRsa = $derived(algo.startsWith('RSA'));
	const isEc = $derived(algo === 'ECDSA' || algo === 'ECDH');

	function pem(label: string, der: ArrayBuffer): string {
		const b64 = bytesToBase64(new Uint8Array(der));
		return `-----BEGIN ${label}-----\n${b64.match(/.{1,64}/g)!.join('\n')}\n-----END ${label}-----`;
	}

	// Format OpenSSH "ssh-ed25519 AAAA…" / "ssh-rsa AAAA…" (hanya untuk kunci signing yang didukung SSH).
	function sshString(...parts: Uint8Array[]): string {
		const len = parts.reduce((n, p) => n + 4 + p.length, 0);
		const out = new Uint8Array(len);
		let o = 0;
		for (const p of parts) {
			new DataView(out.buffer).setUint32(o, p.length);
			out.set(p, o + 4);
			o += 4 + p.length;
		}
		return bytesToBase64(out);
	}
	const b64urlToBytes = (s: string) =>
		Uint8Array.from(
			atob(s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4)),
			(c) => c.charCodeAt(0)
		);
	const mpint = (b: Uint8Array) => (b[0] & 0x80 ? new Uint8Array([0, ...b]) : b);

	async function generate() {
		busy = true;
		error = null;
		try {
			const usages: KeyUsage[] =
				algo === 'RSA-OAEP'
					? ['encrypt', 'decrypt']
					: algo === 'ECDH' || algo === 'X25519'
						? ['deriveBits']
						: ['sign', 'verify'];
			const params: AlgorithmIdentifier | RsaHashedKeyGenParams | EcKeyGenParams = isRsa
				? {
						name: algo,
						modulusLength: modulus,
						publicExponent: new Uint8Array([1, 0, 1]),
						hash: 'SHA-256'
					}
				: isEc
					? { name: algo, namedCurve: curve }
					: { name: algo };
			const pair = (await crypto.subtle.generateKey(params, true, usages)) as CryptoKeyPair;
			const [spki, pkcs8, pubJwk, privJwk] = await Promise.all([
				crypto.subtle.exportKey('spki', pair.publicKey),
				crypto.subtle.exportKey('pkcs8', pair.privateKey),
				crypto.subtle.exportKey('jwk', pair.publicKey),
				crypto.subtle.exportKey('jwk', pair.privateKey)
			]);
			const fp = new Uint8Array(await crypto.subtle.digest('SHA-256', spki));
			const enc = new TextEncoder();
			let ssh: string | null = null;
			if (algo === 'Ed25519')
				ssh = `ssh-ed25519 ${sshString(enc.encode('ssh-ed25519'), b64urlToBytes(pubJwk.x!))} generated-key`;
			else if (algo === 'RSASSA-PKCS1-v1_5')
				ssh = `ssh-rsa ${sshString(enc.encode('ssh-rsa'), mpint(b64urlToBytes(pubJwk.e!)), mpint(b64urlToBytes(pubJwk.n!)))} generated-key`;
			else if (algo === 'ECDSA') {
				const id = `nistp${curve.slice(2)}`;
				const point = new Uint8Array([4, ...b64urlToBytes(pubJwk.x!), ...b64urlToBytes(pubJwk.y!)]);
				ssh = `ecdsa-sha2-${id} ${sshString(enc.encode(`ecdsa-sha2-${id}`), enc.encode(id), point)} generated-key`;
			}
			keys = {
				pubPem: pem('PUBLIC KEY', spki),
				privPem: pem('PRIVATE KEY', pkcs8),
				pubJwk: JSON.stringify(pubJwk, null, 2),
				privJwk: JSON.stringify(privJwk, null, 2),
				fingerprint: `SHA256:${bytesToBase64(fp).replace(/=+$/, '')} · ${bytesToHex(fp).match(/../g)!.slice(0, 16).join(':')}…`,
				ssh
			};
		} catch (e) {
			keys = null;
			error = `${errorMessage(e)}${algo === 'Ed25519' || algo === 'X25519' ? ' — this browser may not support it in WebCrypto yet.' : ''}`;
		} finally {
			busy = false;
		}
	}
</script>

<ToolHeader slug="keypair" />

<div class="space-y-4">
	<div class="flex flex-wrap items-center gap-3">
		<NativeSelect size="sm" bind:value={algo} aria-label="Algorithm">
			{#each ALGOS as [v, label] (v)}<option value={v}>{label}</option>{/each}
		</NativeSelect>
		{#if isRsa}
			<NativeSelect size="sm" bind:value={modulus} aria-label="Key size">
				<option value={2048}>2048 bits</option>
				<option value={3072}>3072 bits</option>
				<option value={4096}>4096 bits</option>
			</NativeSelect>
		{:else if isEc}
			<NativeSelect size="sm" bind:value={curve} aria-label="Curve">
				<option value="P-256">P-256</option>
				<option value="P-384">P-384</option>
				<option value="P-521">P-521</option>
			</NativeSelect>
		{/if}
		<Button size="sm" onclick={generate} disabled={busy}
			>{#if busy}<Spinner />{:else}<KeyRound />{/if}Generate</Button
		>
		{#if keys}
			<Segmented
				bind:value={format}
				options={[
					{ value: 'pem', label: 'PEM' },
					{ value: 'jwk', label: 'JWK' }
				]}
				ariaLabel="Format"
			/>
		{/if}
	</div>

	{#if error}<p role="alert" class="text-destructive text-sm">{error}</p>{/if}

	{#if keys}
		<p class="text-muted-foreground font-mono text-xs break-all">Fingerprint {keys.fingerprint}</p>
		<div class="grid gap-4 lg:grid-cols-2">
			<Output
				value={format === 'pem' ? keys.pubPem : keys.pubJwk}
				label={format === 'pem' ? 'Public key (SPKI)' : 'Public JWK'}
				height="h-72"
			/>
			<Output
				value={format === 'pem' ? keys.privPem : keys.privJwk}
				label={format === 'pem' ? 'Private key (PKCS#8)' : 'Private JWK'}
				height="h-72"
			/>
		</div>
		{#if keys.ssh}
			<Output value={keys.ssh} label="OpenSSH public key (authorized_keys)" height="h-24" />
		{/if}
	{/if}
	<p class="text-muted-foreground text-xs">
		Keys are generated with WebCrypto in this tab and never leave the browser. Treat the private key
		as a secret — don't paste it into notes or snippets unencrypted.
	</p>
</div>
