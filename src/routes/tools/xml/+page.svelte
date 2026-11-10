<script lang="ts">
	import ToolHeader from '$lib/components/tools/ToolHeader.svelte';
	import Segmented from '$lib/components/tools/Segmented.svelte';
	import TextInput from '$lib/components/tools/TextInput.svelte';
	import Output from '$lib/components/tools/Output.svelte';
	import XmlNode from './XmlNode.svelte';
	import { Input } from '$lib/components/ui/input/index.js';
	import { NativeSelect } from '$lib/components/ui/native-select/index.js';

	let input = $state(`<?xml version="1.0" encoding="UTF-8"?>
<catalog xmlns:dc="http://purl.org/dc/elements/1.1/">
  <book id="bk101" lang="en"><dc:title>XML Developer's Guide</dc:title><price currency="USD">44.95</price></book>
  <book id="bk102" lang="id"><dc:title>Midnight Rain</dc:title><price currency="IDR">95000</price><!-- discounted --></book>
</catalog>`);
	let view = $state<'pretty' | 'minify' | 'tree' | 'json'>('pretty');
	let indent = $state('  ');
	let xpath = $state('//book[@lang="en"]/*[local-name()="title"]');

	const doc = $derived.by((): { doc: XMLDocument | null; error: string | null } => {
		if (!input.trim()) return { doc: null, error: null };
		const d = new DOMParser().parseFromString(input, 'application/xml');
		const err = d.querySelector('parsererror');
		if (err)
			return { doc: null, error: (err.textContent ?? 'Parse error').replace(/\s+/g, ' ').trim() };
		return { doc: d, error: null };
	});

	const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
	const escAttr = (s: string) => esc(s).replace(/"/g, '&quot;');

	function pretty(node: Node, depth: number, ind: string): string {
		const pad = ind.repeat(depth);
		switch (node.nodeType) {
			case Node.ELEMENT_NODE: {
				const el = node as Element;
				const attrs = [...el.attributes].map((a) => ` ${a.name}="${escAttr(a.value)}"`).join('');
				const kids = [...el.childNodes].filter(
					(c) => !(c.nodeType === Node.TEXT_NODE && !c.textContent?.trim())
				);
				if (!kids.length) return `${pad}<${el.tagName}${attrs}/>`;
				if (kids.length === 1 && kids[0].nodeType === Node.TEXT_NODE)
					return `${pad}<${el.tagName}${attrs}>${esc(kids[0].textContent!.trim())}</${el.tagName}>`;
				return `${pad}<${el.tagName}${attrs}>\n${kids.map((k) => pretty(k, depth + 1, ind)).join('\n')}\n${pad}</${el.tagName}>`;
			}
			case Node.TEXT_NODE:
				return pad + esc(node.textContent!.trim());
			case Node.CDATA_SECTION_NODE:
				return `${pad}<![CDATA[${node.textContent}]]>`;
			case Node.COMMENT_NODE:
				return `${pad}<!--${node.textContent}-->`;
			case Node.PROCESSING_INSTRUCTION_NODE: {
				const pi = node as ProcessingInstruction;
				return `${pad}<?${pi.target} ${pi.data}?>`;
			}
		}
		return '';
	}

	function serialize(d: XMLDocument, ind: string | null): string {
		const decl = input.trim().match(/^<\?xml[^?]*\?>/)?.[0];
		const nodes = [...d.childNodes].map((n) =>
			ind === null ? new XMLSerializer().serializeToString(n) : pretty(n, 0, ind)
		);
		let out = nodes.join(ind === null ? '' : '\n');
		if (ind === null) out = out.replace(/>\s+</g, '><');
		return (decl ? decl + (ind === null ? '' : '\n') : '') + out;
	}

	// XML → JSON: atribut jadi "@name", teks campuran jadi "#text", elemen berulang jadi array.
	function toJson(el: Element): unknown {
		const obj: Record<string, unknown> = {};
		for (const a of el.attributes) obj[`@${a.name}`] = a.value;
		const kids = [...el.children];
		const text = [...el.childNodes]
			.filter((n) => n.nodeType === Node.TEXT_NODE || n.nodeType === Node.CDATA_SECTION_NODE)
			.map((n) => n.textContent)
			.join('')
			.trim();
		if (!kids.length && !el.attributes.length) return text;
		for (const k of kids) {
			const v = toJson(k);
			if (k.tagName in obj) {
				const cur = obj[k.tagName];
				obj[k.tagName] = Array.isArray(cur) ? [...cur, v] : [cur, v];
			} else obj[k.tagName] = v;
		}
		if (text) obj['#text'] = text;
		return obj;
	}

	const out = $derived.by(() => {
		if (!doc.doc) return '';
		if (view === 'pretty') return serialize(doc.doc, indent);
		if (view === 'minify') return serialize(doc.doc, null);
		if (view === 'json') {
			const root = doc.doc.documentElement;
			return JSON.stringify({ [root.tagName]: toJson(root) }, null, 2);
		}
		return '';
	});

	const stats = $derived.by(() => {
		if (!doc.doc) return null;
		const all = doc.doc.getElementsByTagName('*');
		let attrs = 0;
		let depth = 0;
		for (const el of all) {
			attrs += el.attributes.length;
			let d = 0;
			for (let p: Element | null = el; p; p = p.parentElement) d++;
			depth = Math.max(depth, d);
		}
		return { elements: all.length, attrs, depth, root: doc.doc.documentElement.tagName };
	});

	const xpathResult = $derived.by((): { items: string[]; error: string | null } => {
		if (!doc.doc || !xpath.trim()) return { items: [], error: null };
		try {
			const d = doc.doc;
			const resolver = (prefix: string | null) =>
				prefix ? d.documentElement.lookupNamespaceURI(prefix) : null;
			const r = d.evaluate(xpath, d, resolver, XPathResult.ANY_TYPE, null);
			switch (r.resultType) {
				case XPathResult.NUMBER_TYPE:
					return { items: [String(r.numberValue)], error: null };
				case XPathResult.STRING_TYPE:
					return { items: [r.stringValue], error: null };
				case XPathResult.BOOLEAN_TYPE:
					return { items: [String(r.booleanValue)], error: null };
			}
			const items: string[] = [];
			for (let n = r.iterateNext(); n && items.length < 500; n = r.iterateNext()) {
				items.push(
					n.nodeType === Node.ELEMENT_NODE
						? new XMLSerializer().serializeToString(n)
						: (n.textContent ?? '')
				);
			}
			return { items, error: null };
		} catch (e) {
			return { items: [], error: e instanceof Error ? e.message : String(e) };
		}
	});
</script>

<ToolHeader slug="xml" />

<div class="space-y-4">
	<div class="flex flex-wrap items-center gap-3">
		<Segmented
			bind:value={view}
			options={[
				{ value: 'pretty', label: 'Pretty' },
				{ value: 'minify', label: 'Minify' },
				{ value: 'tree', label: 'Tree' },
				{ value: 'json', label: 'To JSON' }
			]}
			ariaLabel="View"
		/>
		{#if view === 'pretty'}
			<NativeSelect size="sm" bind:value={indent} aria-label="Indentation">
				<option value="  ">2 spaces</option>
				<option value="    ">4 spaces</option>
				<option value={'\t'}>Tab</option>
			</NativeSelect>
		{/if}
		{#if stats}
			<span class="text-muted-foreground text-xs">
				✓ Well-formed · root &lt;{stats.root}&gt; · {stats.elements} elements · {stats.attrs} attributes
				· depth {stats.depth}
			</span>
		{/if}
	</div>

	<div class="grid gap-4 lg:grid-cols-2">
		<TextInput bind:value={input} label="XML" height="h-96" />
		{#if view === 'tree'}
			<section class="min-w-0 space-y-2">
				<div class="flex min-h-7 items-center"><span class="label-mono">Tree</span></div>
				{#if doc.error}
					<p
						role="alert"
						class="border-destructive/40 text-destructive rounded-md border p-3 text-sm"
					>
						{doc.error}
					</p>
				{:else if doc.doc}
					<div class="bg-well h-96 overflow-auto rounded-md border p-3 ps-6">
						<XmlNode node={doc.doc.documentElement} />
					</div>
				{/if}
			</section>
		{:else}
			<Output
				value={out}
				error={doc.error}
				label={view === 'json' ? 'JSON' : 'XML'}
				height="h-96"
				wrap={view === 'minify'}
			/>
		{/if}
	</div>

	<section class="space-y-2">
		<h2 class="label-mono">XPath query</h2>
		<Input
			class="font-mono text-sm"
			bind:value={xpath}
			spellcheck="false"
			aria-label="XPath expression"
		/>
		{#if xpathResult.error}
			<p role="alert" class="text-destructive text-sm">{xpathResult.error}</p>
		{:else if doc.doc && xpath.trim()}
			<p class="text-muted-foreground text-xs">
				{xpathResult.items.length} result{xpathResult.items.length === 1 ? '' : 's'}
			</p>
			{#if xpathResult.items.length}
				<ul class="bg-card divide-y rounded-lg border" role="list">
					{#each xpathResult.items as item, i (i)}
						<li class="px-3 py-1.5 font-mono text-xs break-all">{item}</li>
					{/each}
				</ul>
			{/if}
		{/if}
	</section>
</div>
