<script lang="ts">
	import QRCode from 'qrcode';
	import ToolHeader from '$lib/components/tools/ToolHeader.svelte';
	import Segmented from '$lib/components/tools/Segmented.svelte';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { NativeSelect } from '$lib/components/ui/native-select/index.js';
	import { Checkbox } from '$lib/components/ui/checkbox/index.js';
	import Download from '@lucide/svelte/icons/download';
	import { downloadBlob, errorMessage } from '$lib/tool-utils';

	let kind = $state<'text' | 'wifi' | 'email' | 'phone'>('text');
	let text = $state('https://example.com');
	let wifi = $state({ ssid: '', password: '', security: 'WPA', hidden: false });
	let email = $state({ to: '', subject: '', body: '' });
	let phone = $state('');
	let ecl = $state<'L' | 'M' | 'Q' | 'H'>('M');
	let size = $state(320);
	let margin = $state(2);
	let fg = $state('#000000');
	let bg = $state('#ffffff');

	const wifiEsc = (s: string) => s.replace(/([\\;,:"])/g, '\\$1');
	const payload = $derived.by(() => {
		switch (kind) {
			case 'text':
				return text;
			case 'wifi':
				return wifi.ssid
					? `WIFI:T:${wifi.security === 'nopass' ? 'nopass' : wifi.security};S:${wifiEsc(wifi.ssid)};${wifi.security !== 'nopass' ? `P:${wifiEsc(wifi.password)};` : ''}${wifi.hidden ? 'H:true;' : ''};`
					: '';
			case 'email': {
				const q = new URLSearchParams();
				if (email.subject) q.set('subject', email.subject);
				if (email.body) q.set('body', email.body);
				const qs = q.toString().replace(/\+/g, '%20');
				return email.to ? `mailto:${email.to}${qs ? '?' + qs : ''}` : '';
			}
			case 'phone':
				return phone ? `tel:${phone.replace(/[^\d+]/g, '')}` : '';
		}
	});

	let canvas = $state<HTMLCanvasElement>();
	let error = $state<string | null>(null);

	$effect(() => {
		if (!canvas) return;
		const opts = { errorCorrectionLevel: ecl, width: size, margin, color: { dark: fg, light: bg } };
		if (!payload) {
			canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
			error = null;
			return;
		}
		QRCode.toCanvas(canvas, payload, opts).then(
			() => (error = null),
			(e) => (error = errorMessage(e))
		);
	});

	function downloadPng() {
		canvas?.toBlob((b) => b && downloadBlob(b, 'qrcode.png'), 'image/png');
	}

	async function downloadSvg() {
		const svg = await QRCode.toString(payload, {
			type: 'svg',
			errorCorrectionLevel: ecl,
			margin,
			color: { dark: fg, light: bg }
		});
		downloadBlob(new Blob([svg], { type: 'image/svg+xml' }), 'qrcode.svg');
	}
</script>

<ToolHeader slug="qr" />

<div class="grid gap-6 lg:grid-cols-[1fr_auto]">
	<section class="space-y-4">
		<Segmented
			bind:value={kind}
			options={[
				{ value: 'text', label: 'Text / URL' },
				{ value: 'wifi', label: 'Wi-Fi' },
				{ value: 'email', label: 'Email' },
				{ value: 'phone', label: 'Phone' }
			]}
			ariaLabel="Content type"
		/>

		{#if kind === 'text'}
			<Textarea
				class="bg-well h-32 font-mono text-xs"
				bind:value={text}
				aria-label="Text or URL"
				spellcheck="false"
			/>
		{:else if kind === 'wifi'}
			<div class="grid gap-3 sm:grid-cols-2">
				<div class="grid gap-1.5">
					<Label for="qr-ssid" class="text-xs">Network name (SSID)</Label><Input
						id="qr-ssid"
						bind:value={wifi.ssid}
					/>
				</div>
				<div class="grid gap-1.5">
					<Label for="qr-sec" class="text-xs">Security</Label>
					<NativeSelect id="qr-sec" bind:value={wifi.security}>
						<option value="WPA">WPA / WPA2 / WPA3</option>
						<option value="WEP">WEP</option>
						<option value="nopass">None</option>
					</NativeSelect>
				</div>
				{#if wifi.security !== 'nopass'}
					<div class="grid gap-1.5">
						<Label for="qr-pass" class="text-xs">Password</Label><Input
							id="qr-pass"
							bind:value={wifi.password}
						/>
					</div>
				{/if}
				<div class="flex items-center gap-2 self-end pb-2">
					<Checkbox id="qr-hidden" bind:checked={wifi.hidden} />
					<Label for="qr-hidden" class="text-xs font-normal">Hidden network</Label>
				</div>
			</div>
		{:else if kind === 'email'}
			<div class="grid gap-3">
				<div class="grid gap-1.5">
					<Label for="qr-to" class="text-xs">To</Label><Input
						id="qr-to"
						type="email"
						bind:value={email.to}
					/>
				</div>
				<div class="grid gap-1.5">
					<Label for="qr-subj" class="text-xs">Subject</Label><Input
						id="qr-subj"
						bind:value={email.subject}
					/>
				</div>
				<div class="grid gap-1.5">
					<Label for="qr-body" class="text-xs">Body</Label><Textarea
						id="qr-body"
						class="h-20"
						bind:value={email.body}
					/>
				</div>
			</div>
		{:else}
			<div class="grid max-w-xs gap-1.5">
				<Label for="qr-phone" class="text-xs">Phone number</Label><Input
					id="qr-phone"
					type="tel"
					bind:value={phone}
					placeholder="+62812…"
				/>
			</div>
		{/if}

		<div class="flex flex-wrap items-end gap-3">
			<div class="grid gap-1.5">
				<Label for="qr-ecl" class="text-xs">Error correction</Label>
				<NativeSelect id="qr-ecl" size="sm" bind:value={ecl}>
					<option value="L">L · 7%</option>
					<option value="M">M · 15%</option>
					<option value="Q">Q · 25%</option>
					<option value="H">H · 30%</option>
				</NativeSelect>
			</div>
			<div class="grid w-24 gap-1.5">
				<Label for="qr-size" class="text-xs">Size (px)</Label><Input
					id="qr-size"
					class="h-8"
					type="number"
					min="64"
					max="2048"
					step="32"
					bind:value={size}
				/>
			</div>
			<div class="grid w-20 gap-1.5">
				<Label for="qr-margin" class="text-xs">Margin</Label><Input
					id="qr-margin"
					class="h-8"
					type="number"
					min="0"
					max="16"
					bind:value={margin}
				/>
			</div>
			<div class="grid gap-1.5">
				<Label for="qr-fg" class="text-xs">Foreground</Label><Input
					id="qr-fg"
					type="color"
					class="h-8 w-14 p-1"
					bind:value={fg}
				/>
			</div>
			<div class="grid gap-1.5">
				<Label for="qr-bg" class="text-xs">Background</Label><Input
					id="qr-bg"
					type="color"
					class="h-8 w-14 p-1"
					bind:value={bg}
				/>
			</div>
		</div>
		{#if payload && kind !== 'text'}
			<p class="text-muted-foreground font-mono text-xs break-all">{payload}</p>
		{/if}
	</section>

	<section class="space-y-3">
		<div class="bg-well flex min-h-64 items-center justify-center rounded-lg border p-3">
			<canvas
				bind:this={canvas}
				class="max-w-full rounded {payload ? '' : 'hidden'}"
				style="image-rendering: pixelated"
			></canvas>
			{#if !payload}<span class="text-muted-foreground text-sm">Enter content to generate</span
				>{/if}
		</div>
		{#if error}<p role="alert" class="text-destructive text-sm">{error}</p>{/if}
		<div class="flex gap-2">
			<Button size="sm" onclick={downloadPng} disabled={!payload || !!error}><Download />PNG</Button
			>
			<Button size="sm" variant="outline" onclick={downloadSvg} disabled={!payload || !!error}
				><Download />SVG</Button
			>
		</div>
	</section>
</div>
