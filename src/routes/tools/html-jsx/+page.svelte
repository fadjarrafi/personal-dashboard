<script lang="ts">
	import ToolHeader from '$lib/components/tools/ToolHeader.svelte';
	import TextInput from '$lib/components/tools/TextInput.svelte';
	import Output from '$lib/components/tools/Output.svelte';
	import { Checkbox } from '$lib/components/ui/checkbox/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Input } from '$lib/components/ui/input/index.js';

	let input = $state(`<!-- Card -->
<div class="card" style="margin-top: 8px; background-color: #fff" tabindex="0">
  <label for="email">Email</label>
  <input type="email" id="email" required autofocus>
  <img src="/logo.svg" alt="Logo">
  <button onclick="save()" disabled>Save</button>
  <svg viewBox="0 0 24 24" stroke-width="2"><path fill-rule="evenodd" d="M0 0h24v24H0z"/></svg>
</div>`);
	let wrapComponent = $state(false);
	let componentName = $state('MyComponent');

	const VOID = new Set([
		'area',
		'base',
		'br',
		'col',
		'embed',
		'hr',
		'img',
		'input',
		'link',
		'meta',
		'source',
		'track',
		'wbr'
	]);
	const ATTR: Record<string, string> = {
		class: 'className',
		for: 'htmlFor',
		tabindex: 'tabIndex',
		readonly: 'readOnly',
		maxlength: 'maxLength',
		minlength: 'minLength',
		colspan: 'colSpan',
		rowspan: 'rowSpan',
		cellpadding: 'cellPadding',
		cellspacing: 'cellSpacing',
		contenteditable: 'contentEditable',
		crossorigin: 'crossOrigin',
		autocomplete: 'autoComplete',
		autofocus: 'autoFocus',
		enctype: 'encType',
		formaction: 'formAction',
		frameborder: 'frameBorder',
		inputmode: 'inputMode',
		novalidate: 'noValidate',
		spellcheck: 'spellCheck',
		srcset: 'srcSet',
		usemap: 'useMap',
		datetime: 'dateTime',
		accesskey: 'accessKey',
		allowfullscreen: 'allowFullScreen',
		'accept-charset': 'acceptCharset',
		'http-equiv': 'httpEquiv',
		viewbox: 'viewBox',
		'xlink:href': 'xlinkHref',
		'xml:space': 'xmlSpace'
	};
	const BOOL = new Set([
		'required',
		'disabled',
		'checked',
		'selected',
		'multiple',
		'autofocus',
		'readonly',
		'hidden',
		'novalidate',
		'allowfullscreen',
		'async',
		'defer',
		'autoplay',
		'controls',
		'loop',
		'muted',
		'open',
		'playsinline'
	]);

	const camel = (s: string) => s.replace(/[-:]([a-z])/g, (_, c) => c.toUpperCase());

	function attrName(name: string): string {
		const n = name.toLowerCase();
		if (ATTR[n]) return ATTR[n];
		if (n.startsWith('data-') || n.startsWith('aria-')) return n;
		if (/^on[a-z]+$/.test(n)) return 'on' + n.charAt(2).toUpperCase() + n.slice(3);
		// Atribut SVG ber-dash (stroke-width, fill-rule, …) → camelCase.
		return n.includes('-') || n.includes(':') ? camel(n) : name;
	}

	function styleObject(css: string): string {
		const props = css
			.split(';')
			.map((d) => d.trim())
			.filter(Boolean)
			.map((d) => {
				const i = d.indexOf(':');
				const k = d.slice(0, i).trim();
				const v = d.slice(i + 1).trim();
				const key = k.startsWith('--') ? `'${k}'` : camel(k.replace(/^-ms-/, 'ms-'));
				return `${key}: ${/^-?\d+(\.\d+)?$/.test(v) ? v : `'${v.replace(/'/g, "\\'")}'`}`;
			});
		return `{{ ${props.join(', ')} }}`;
	}

	const jsxText = (s: string) => s.replace(/[{}<>]/g, (c) => `{'${c}'}`);
	const jsxAttr = (s: string) => (s.includes('"') ? `{${JSON.stringify(s)}}` : `"${s}"`);

	function convert(node: Node, depth: number): string {
		const pad = '  '.repeat(depth);
		if (node.nodeType === Node.TEXT_NODE) {
			const t = node.textContent ?? '';
			return t.trim() ? pad + jsxText(t.trim().replace(/\s+/g, ' ')) : '';
		}
		if (node.nodeType === Node.COMMENT_NODE)
			return `${pad}{/* ${(node.textContent ?? '').trim()} */}`;
		if (node.nodeType !== Node.ELEMENT_NODE) return '';
		const el = node as Element;
		const tag =
			el.namespaceURI === 'http://www.w3.org/2000/svg' ? el.tagName : el.tagName.toLowerCase();
		const attrs = [...el.attributes].map((a) => {
			const name = attrName(a.name);
			if (a.name === 'style') return `style=${styleObject(a.value)}`;
			if (
				BOOL.has(a.name.toLowerCase()) &&
				(a.value === '' || a.value.toLowerCase() === a.name.toLowerCase())
			)
				return name;
			if (/^on[a-z]+$/i.test(a.name)) return `${name}={() => { ${a.value} }}`;
			return `${name}=${jsxAttr(a.value)}`;
		});
		const open = `<${tag}${attrs.length ? ' ' + attrs.join(' ') : ''}`;
		const source = tag === 'template' ? (el as HTMLTemplateElement).content : el;
		const children = [...source.childNodes].map((c) => convert(c, depth + 1)).filter(Boolean);
		if (!children.length || VOID.has(tag)) return `${pad}${open} />`;
		return `${pad}${open}>\n${children.join('\n')}\n${pad}</${tag}>`;
	}

	const out = $derived.by(() => {
		if (!input.trim()) return '';
		const tpl = document.createElement('template');
		tpl.innerHTML = input;
		const base = wrapComponent ? 2 : 0;
		const nodes = [...tpl.content.childNodes].filter(
			(n) => n.nodeType !== Node.TEXT_NODE || n.textContent?.trim()
		);
		// Lebih dari satu root → bungkus dengan fragment dan indent anak satu level lebih dalam.
		const fragment = nodes.length > 1;
		const parts = nodes.map((n) => convert(n, base + (fragment ? 1 : 0))).filter(Boolean);
		const pad = '  '.repeat(base);
		const body = fragment ? `${pad}<>\n${parts.join('\n')}\n${pad}</>` : (parts[0] ?? '');
		if (!wrapComponent) return body;
		return `export default function ${componentName || 'Component'}() {\n  return (\n${body}\n  );\n}`;
	});
</script>

<ToolHeader slug="html-jsx" />

<div class="space-y-3">
	<div class="flex flex-wrap items-center gap-3">
		<div class="flex items-center gap-2">
			<Checkbox id="jsx-wrap" bind:checked={wrapComponent} />
			<Label for="jsx-wrap" class="text-xs font-normal">Wrap in component</Label>
		</div>
		{#if wrapComponent}
			<Input class="h-8 w-48 font-mono" bind:value={componentName} aria-label="Component name" />
		{/if}
	</div>
	<div class="grid gap-4 lg:grid-cols-2">
		<TextInput bind:value={input} label="HTML" height="h-96" />
		<Output value={out} label="JSX" height="h-96" wrap={false} />
	</div>
	<p class="text-muted-foreground text-xs">
		Parsed with the browser's HTML parser (template element — scripts never run). Inline event
		handlers become arrow functions you'll want to replace with real callbacks.
	</p>
</div>
