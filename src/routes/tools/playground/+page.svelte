<script lang="ts">
	import { onMount } from 'svelte';
	import { marked } from 'marked';
	import ToolHeader from '$lib/components/tools/ToolHeader.svelte';
	import Segmented from '$lib/components/tools/Segmented.svelte';
	import SandboxFrame from '$lib/components/tools/SandboxFrame.svelte';
	import JsonTree from '$lib/components/tools/JsonTree.svelte';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Checkbox } from '$lib/components/ui/checkbox/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import Play from '@lucide/svelte/icons/play';
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
	import { PREVIEW_CSS, errorMessage } from '$lib/tool-utils';

	type Mode = 'web' | 'json' | 'markdown';
	type Pane = 'html' | 'css' | 'js';

	const DEFAULTS = {
		html: '<h1>Hello playground</h1>\n<button id="btn">Click me</button>\n<p id="out"></p>',
		css: 'body { font-family: system-ui; padding: 1rem; }\nh1 { color: tomato; }\nbutton { padding: .5rem 1rem; }',
		js: "let n = 0;\ndocument.getElementById('btn').addEventListener('click', () => {\n  n++;\n  document.getElementById('out').textContent = `Clicked ${n}×`;\n  console.log('click', { n });\n});\n\nconsole.log('Ready at', new Date().toISOString());",
		json: '{\n  "hello": "world",\n  "list": [1, 2, 3],\n  "nested": { "ok": true }\n}',
		markdown: '# Markdown\n\n- **bold**\n- `code`\n\n```js\nconsole.log(1)\n```'
	};
	const STORAGE_KEY = 'pd:tools:playground';

	let mode = $state<Mode>('web');
	let pane = $state<Pane>('js');
	let code = $state({ ...DEFAULTS });
	let autoRun = $state(true);
	let frame = $state<HTMLIFrameElement>();
	let srcdoc = $state('');
	let logs = $state<{ level: string; text: string }[]>([]);

	onMount(() => {
		try {
			const saved = localStorage.getItem(STORAGE_KEY);
			if (saved) code = { ...DEFAULTS, ...JSON.parse(saved) };
		} catch {
			// storage tidak tersedia — pakai default
		}
		const onMessage = (e: MessageEvent) => {
			if (!frame || e.source !== frame.contentWindow) return;
			const d = e.data as { __pg?: true; level: string; text: string };
			if (d?.__pg) logs = [...logs.slice(-499), { level: d.level, text: d.text }];
		};
		window.addEventListener('message', onMessage);
		return () => window.removeEventListener('message', onMessage);
	});

	// Simpan draft per-viewer (kenyamanan saja; boleh gagal).
	$effect(() => {
		const snapshot = JSON.stringify(code);
		const t = setTimeout(() => {
			try {
				localStorage.setItem(STORAGE_KEY, snapshot);
			} catch {
				// abaikan
			}
		}, 500);
		return () => clearTimeout(t);
	});

	// Script ini disuntikkan ke frame: meneruskan console.* dan error ke parent via postMessage.
	const BRIDGE = `<script>(() => {
		const fmt = (v) => { if (typeof v === 'string') return v; try { return v instanceof Error ? v.stack || String(v) : JSON.stringify(v, null, 2) ?? String(v); } catch { return String(v); } };
		for (const level of ['log', 'info', 'warn', 'error', 'debug']) {
			const orig = console[level];
			console[level] = (...args) => { parent.postMessage({ __pg: true, level, text: args.map(fmt).join(' ') }, '*'); orig.apply(console, args); };
		}
		addEventListener('error', (e) => parent.postMessage({ __pg: true, level: 'error', text: e.message + (e.lineno ? ' (line ' + e.lineno + ')' : '') }, '*'));
		addEventListener('unhandledrejection', (e) => parent.postMessage({ __pg: true, level: 'error', text: 'Unhandled rejection: ' + fmt(e.reason) }, '*'));
	})();<\/script>`;

	function run() {
		logs = [];
		const js = code.js.replace(/<\/script/gi, '<\\/script');
		srcdoc = `<!doctype html><html><head><meta charset="utf-8">${BRIDGE}<style>${code.css}</style></head><body>${code.html}<script type="module">${js}<\/script></body></html>`;
	}

	$effect(() => {
		if (mode !== 'web' || !autoRun) return;
		void code.html;
		void code.css;
		void code.js;
		const t = setTimeout(run, 600);
		return () => clearTimeout(t);
	});

	const json = $derived.by(() => {
		if (mode !== 'json') return null;
		try {
			return { value: JSON.parse(code.json), error: null };
		} catch (e) {
			return { value: null, error: errorMessage(e) };
		}
	});

	const mdDoc = $derived(
		mode === 'markdown'
			? `<!doctype html><meta charset="utf-8"><style>${PREVIEW_CSS}</style>${marked.parse(code.markdown, { gfm: true, async: false })}`
			: ''
	);

	const editorKey = $derived<keyof typeof code>(mode === 'web' ? pane : mode);
	const LOG_CLASS: Record<string, string> = {
		warn: 'text-warning',
		error: 'text-destructive',
		info: 'text-primary',
		debug: 'text-muted-foreground'
	};
</script>

<ToolHeader slug="playground" />

<div class="space-y-3">
	<div class="flex flex-wrap items-center gap-3">
		<Segmented
			bind:value={mode}
			options={[
				{ value: 'web', label: 'JS / HTML / CSS' },
				{ value: 'json', label: 'JSON' },
				{ value: 'markdown', label: 'Markdown' }
			]}
			ariaLabel="Mode"
		/>
		{#if mode === 'web'}
			<Button size="sm" onclick={run}><Play />Run</Button>
			<div class="flex items-center gap-2">
				<Checkbox id="pg-auto" bind:checked={autoRun} />
				<Label for="pg-auto" class="text-xs font-normal">Auto-run</Label>
			</div>
		{/if}
		<Button
			variant="ghost"
			size="sm"
			class="ms-auto"
			onclick={() => (code[editorKey] = DEFAULTS[editorKey])}><RotateCcw />Reset {editorKey}</Button
		>
	</div>

	<div class="grid gap-4 xl:grid-cols-2">
		<section class="min-w-0 space-y-2">
			{#if mode === 'web'}
				<Segmented
					bind:value={pane}
					options={[
						{ value: 'html', label: 'HTML' },
						{ value: 'css', label: 'CSS' },
						{ value: 'js', label: 'JavaScript' }
					]}
					ariaLabel="Editor"
				/>
			{:else}
				<div class="flex min-h-8 items-center"><span class="label-mono">{mode}</span></div>
			{/if}
			<Textarea
				class="bg-well h-[30rem] font-mono text-xs"
				bind:value={code[editorKey]}
				spellcheck="false"
				aria-label="{editorKey} editor"
				onkeydown={(e) => {
					// Tab menyisipkan 2 spasi; Ctrl/Cmd+Enter menjalankan kode.
					if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && mode === 'web') {
						e.preventDefault();
						run();
					} else if (e.key === 'Tab' && !e.shiftKey) {
						e.preventDefault();
						const el = e.currentTarget;
						const { selectionStart: a, selectionEnd: b } = el;
						code[editorKey] = el.value.slice(0, a) + '  ' + el.value.slice(b);
						requestAnimationFrame(() => el.setSelectionRange(a + 2, a + 2));
					}
				}}
			/>
		</section>

		<section class="min-w-0 space-y-2">
			{#if mode === 'web'}
				<div class="flex min-h-8 items-center"><span class="label-mono">Result</span></div>
				<SandboxFrame bind:frame html={srcdoc} scripts class="h-64" title="Playground result" />
				<div class="flex items-center justify-between">
					<span class="label-mono">Console</span>
					<Button variant="ghost" size="xs" onclick={() => (logs = [])} disabled={!logs.length}
						>Clear</Button
					>
				</div>
				<div
					class="bg-well h-48 overflow-auto rounded-md border p-2 font-mono text-xs"
					role="log"
					aria-live="polite"
				>
					{#each logs as l, i (i)}
						<pre
							class="border-b py-0.5 break-all whitespace-pre-wrap last:border-0 {LOG_CLASS[
								l.level
							] ?? ''}">{l.text}</pre>
					{:else}
						<span class="text-muted-foreground">No output. Ctrl/⌘+Enter to run.</span>
					{/each}
				</div>
			{:else if mode === 'json'}
				<div class="flex min-h-8 items-center"><span class="label-mono">Tree</span></div>
				{#if json?.error}
					<p
						role="alert"
						class="border-destructive/40 text-destructive rounded-md border p-3 text-sm"
					>
						{json.error}
					</p>
				{:else}
					<div class="bg-well h-[30rem] overflow-auto rounded-md border p-3 ps-6">
						<JsonTree value={json?.value} />
					</div>
				{/if}
			{:else}
				<div class="flex min-h-8 items-center"><span class="label-mono">Preview</span></div>
				<SandboxFrame html={mdDoc} class="h-[30rem]" title="Markdown preview" />
			{/if}
		</section>
	</div>
	<p class="text-muted-foreground text-xs">
		Code runs in a sandboxed opaque-origin iframe and is saved in this browser only.
	</p>
</div>
