<script lang="ts">
	import ToolHeader from '$lib/components/tools/ToolHeader.svelte';
	import TextInput from '$lib/components/tools/TextInput.svelte';
	import Output from '$lib/components/tools/Output.svelte';
	import JsonTree from '$lib/components/tools/JsonTree.svelte';
	import Segmented from '$lib/components/tools/Segmented.svelte';
	import { Badge } from '$lib/components/ui/badge/index.js';

	let input = $state(`HTTP/1.1 422 Unprocessable Entity
Content-Type: application/json; charset=utf-8
X-Request-Id: 7f3c2a
Cache-Control: no-store
Set-Cookie: sid=abc; HttpOnly; Secure

{"error":{"code":"validation_failed","message":"Invalid input","fields":[{"name":"email","reason":"format"},{"name":"amount","reason":"min","min":1000}]},"meta":{"requestId":"7f3c2a","ts":1767225600}}`);
	let view = $state<'formatted' | 'tree'>('formatted');

	type Kind = 'json' | 'ndjson' | 'xml' | 'html' | 'form' | 'text';

	const STATUS: Record<number, string> = {
		200: 'OK',
		201: 'Created',
		204: 'No Content',
		301: 'Moved Permanently',
		302: 'Found',
		304: 'Not Modified',
		400: 'Bad Request',
		401: 'Unauthorized',
		403: 'Forbidden',
		404: 'Not Found',
		409: 'Conflict',
		422: 'Unprocessable Entity',
		429: 'Too Many Requests',
		500: 'Internal Server Error',
		502: 'Bad Gateway',
		503: 'Service Unavailable',
		504: 'Gateway Timeout'
	};

	function prettyXml(src: string): string {
		let depth = 0;
		return src
			.replace(/>\s*</g, '><')
			.replace(/></g, '>\n<')
			.split('\n')
			.map((line) => {
				if (/^<\//.test(line)) depth = Math.max(0, depth - 1);
				const out = '  '.repeat(depth) + line;
				if (/^<[^!?/][^>]*[^/]>$/.test(line) && !/<\/[^>]+>$/.test(line)) depth++;
				return out;
			})
			.join('\n');
	}

	const parsed = $derived.by(() => {
		let text = input.replace(/^﻿/, '');
		let statusLine: string | null = null;
		let headers: [string, string][] = [];
		// Pesan HTTP mentah: status/request line + header, dipisah baris kosong dari body.
		const m = text.match(
			/^(HTTP\/[\d.]+ \d{3}[^\r\n]*|(?:GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS) \S+ HTTP\/[\d.]+)\r?\n([\s\S]*?)(?:\r?\n\r?\n|$)/
		);
		if (m) {
			statusLine = m[1];
			headers = m[2]
				.split(/\r?\n/)
				.filter((l) => l.includes(':'))
				.map((l) => [l.slice(0, l.indexOf(':')).trim(), l.slice(l.indexOf(':') + 1).trim()]);
			text = text.slice(m[0].length);
		}
		const ctype = headers.find(([k]) => k.toLowerCase() === 'content-type')?.[1] ?? '';
		const body = text.trim();

		let kind: Kind = 'text';
		let value: unknown = null;
		let formatted = body;
		let error: string | null = null;
		const tryJson = () => {
			try {
				value = JSON.parse(body);
				return true;
			} catch {
				return false;
			}
		};
		if (!body) kind = 'text';
		else if (/json/.test(ctype) || /^[[{]/.test(body)) {
			if (tryJson()) {
				kind = 'json';
				formatted = JSON.stringify(value, null, 2);
			} else if (body.split('\n').every((l) => !l.trim() || /^\s*[[{]/.test(l))) {
				try {
					value = body
						.split('\n')
						.filter((l) => l.trim())
						.map((l) => JSON.parse(l));
					kind = 'ndjson';
					formatted = (value as unknown[]).map((v) => JSON.stringify(v, null, 2)).join('\n\n');
				} catch (e) {
					error = `Looks like JSON but failed to parse: ${e instanceof Error ? e.message : e}`;
				}
			} else error = 'Looks like JSON but failed to parse.';
		} else if (/html/.test(ctype) || /^<!doctype html|^<html/i.test(body)) {
			kind = 'html';
			formatted = prettyXml(body);
		} else if (/xml/.test(ctype) || body.startsWith('<')) {
			kind = 'xml';
			formatted = prettyXml(body);
		} else if (
			/x-www-form-urlencoded/.test(ctype) ||
			/^[\w.%[\]-]+=[^\s]*(&[\w.%[\]-]+=[^\s]*)*$/.test(body)
		) {
			kind = 'form';
			const params = [...new URLSearchParams(body)];
			value = Object.fromEntries(params);
			formatted = params.map(([k, v]) => `${k} = ${v}`).join('\n');
		}

		const code = statusLine?.match(/^HTTP\/[\d.]+ (\d{3})/)?.[1];
		return {
			statusLine,
			code: code ? Number(code) : null,
			headers,
			ctype,
			kind,
			value,
			formatted,
			error,
			size: new TextEncoder().encode(body).length
		};
	});

	const tone = $derived(
		parsed.code === null
			? ''
			: parsed.code < 300
				? 'border-success/40 text-success'
				: parsed.code < 400
					? 'border-primary/40 text-primary'
					: parsed.code < 500
						? 'border-warning/40 text-warning'
						: 'border-destructive/40 text-destructive'
	);
</script>

<ToolHeader slug="api-formatter" />

<div class="space-y-4">
	<TextInput bind:value={input} label="Raw response, request, or body" height="h-56" />

	<div class="flex flex-wrap items-center gap-2">
		{#if parsed.code !== null}
			<Badge variant="outline" class={tone}>{parsed.code} {STATUS[parsed.code] ?? ''}</Badge>
		{:else if parsed.statusLine}
			<Badge variant="outline">{parsed.statusLine}</Badge>
		{/if}
		<Badge variant="outline">{parsed.kind.toUpperCase()}</Badge>
		<span class="text-muted-foreground text-xs"
			>{parsed.size} bytes{parsed.ctype ? ` · ${parsed.ctype}` : ''}</span
		>
		{#if parsed.kind === 'json' || parsed.kind === 'ndjson' || parsed.kind === 'form'}
			<Segmented
				class="ms-auto"
				bind:value={view}
				options={[
					{ value: 'formatted', label: 'Formatted' },
					{ value: 'tree', label: 'Tree' }
				]}
				ariaLabel="Body view"
			/>
		{/if}
	</div>

	{#if parsed.headers.length}
		<details class="bg-card rounded-lg border" open>
			<summary class="label-mono cursor-pointer px-3 py-2"
				>Headers ({parsed.headers.length})</summary
			>
			<dl class="divide-y border-t">
				{#each parsed.headers as [k, v], i (i)}
					<div class="flex gap-3 px-3 py-1 text-xs">
						<dt class="text-ink-2 w-44 shrink-0 font-mono break-all">{k}</dt>
						<dd class="min-w-0 flex-1 font-mono break-all">{v}</dd>
					</div>
				{/each}
			</dl>
		</details>
	{/if}

	{#if view === 'tree' && parsed.value !== null && !parsed.error && parsed.kind !== 'text'}
		<div class="bg-well max-h-[32rem] overflow-auto rounded-md border p-3 ps-6">
			<JsonTree value={parsed.value} />
		</div>
	{:else}
		<Output
			value={parsed.formatted}
			error={parsed.error}
			label="Body"
			height="h-[28rem]"
			wrap={parsed.kind === 'text'}
		/>
	{/if}
</div>
