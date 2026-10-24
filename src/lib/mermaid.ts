// Client-only Mermaid rendering via pele (https://pele.run). Lazy-loaded so the
// bundle only ships on pages that actually contain a diagram.
import type { MountOptions } from 'pele';

type Pele = typeof import('pele');

let pele: Promise<Pele> | null = null;

function loadPele(): Promise<Pele> {
	pele ??= import('pele');
	return pele;
}

// Fixed options — never taken from diagram source (pele security guidance).
// images: false so a diagram can't trigger outbound network requests.
const PELE_OPTIONS: MountOptions = {
	images: false,
	fontFamily: "'Geist Variable', ui-sans-serif, system-ui, sans-serif",
	fontFamilyMono: "'Geist Mono Variable', ui-monospace, monospace",
	zoom: 'auto'
};

/** Render `source` into `el`. pele's mount() never throws; errors are shown in `el`. */
export async function mountMermaid(el: HTMLElement, source: string): Promise<{ destroy(): void }> {
	const { mount } = await loadPele();
	return mount(el, source, PELE_OPTIONS);
}

/**
 * Svelte action: replace every ```mermaid fence (marked emits
 * `<pre><code class="language-mermaid">`) inside `node` with a rendered diagram.
 * Pass the HTML as the parameter so navigating to another note rescans.
 */
export function mermaidBlocks(node: HTMLElement, _html: string) {
	let mounted: { destroy(): void }[] = [];
	let generation = 0;

	function cleanup() {
		for (const m of mounted) m.destroy();
		mounted = [];
	}

	function scan() {
		const gen = ++generation;
		cleanup();
		for (const code of node.querySelectorAll<HTMLElement>('pre > code.language-mermaid')) {
			const pre = code.parentElement!;
			const host = document.createElement('div');
			host.className = 'mermaid-diagram';
			pre.replaceWith(host);
			mountMermaid(host, code.textContent ?? '').then((m) => {
				if (gen === generation) mounted.push(m);
				else m.destroy();
			});
		}
	}

	scan();
	return {
		update() {
			scan();
		},
		destroy() {
			generation++;
			cleanup();
		}
	};
}
