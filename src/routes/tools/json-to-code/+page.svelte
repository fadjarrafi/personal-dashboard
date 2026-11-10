<script lang="ts">
	import ToolHeader from '$lib/components/tools/ToolHeader.svelte';
	import Segmented from '$lib/components/tools/Segmented.svelte';
	import TextInput from '$lib/components/tools/TextInput.svelte';
	import Output from '$lib/components/tools/Output.svelte';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { errorMessage, splitWords } from '$lib/tool-utils';

	type Lang = 'ts' | 'zod' | 'go' | 'rust' | 'python' | 'php';

	let lang = $state<Lang>('ts');
	let rootName = $state('Root');
	let input = $state(`{
  "id": 42,
  "name": "Kopi susu",
  "price": 18.5,
  "available": true,
  "tags": ["drink", "coffee"],
  "merchant": { "id": 7, "name": "Warung", "address": null },
  "variants": [
    { "size": "M", "extra": 0 },
    { "size": "L", "extra": 3000, "note": "large cup" }
  ],
  "created_at": "2026-01-15T08:00:00Z"
}`);

	// ── Model tipe ──
	type Kind = 'str' | 'int' | 'float' | 'bool' | 'null' | 'any' | 'arr' | 'obj';
	interface Field {
		t: Ty;
		opt: boolean;
	}
	interface Ty {
		k: Kind;
		nullable?: boolean;
		of?: Ty;
		fields?: Map<string, Field>;
		name?: string;
	}

	function infer(v: unknown): Ty {
		if (v === null) return { k: 'null' };
		if (Array.isArray(v)) {
			const of = v.map(infer).reduce<Ty | null>((a, b) => (a ? merge(a, b) : b), null);
			return { k: 'arr', of: of ?? { k: 'any' } };
		}
		switch (typeof v) {
			case 'string':
				return { k: 'str' };
			case 'number':
				return { k: Number.isInteger(v) ? 'int' : 'float' };
			case 'boolean':
				return { k: 'bool' };
			case 'object': {
				const fields = new Map<string, Field>();
				for (const [key, val] of Object.entries(v as object))
					fields.set(key, { t: infer(val), opt: false });
				return { k: 'obj', fields };
			}
		}
		return { k: 'any' };
	}

	function merge(a: Ty, b: Ty): Ty {
		if (a.k === 'null') return { ...b, nullable: true };
		if (b.k === 'null') return { ...a, nullable: true };
		const nullable = a.nullable || b.nullable;
		if (a.k === b.k) {
			if (a.k === 'arr') return { k: 'arr', of: merge(a.of!, b.of!), nullable };
			if (a.k === 'obj') {
				const fields = new Map<string, Field>();
				for (const key of new Set([...a.fields!.keys(), ...b.fields!.keys()])) {
					const fa = a.fields!.get(key);
					const fb = b.fields!.get(key);
					fields.set(
						key,
						fa && fb
							? { t: merge(fa.t, fb.t), opt: fa.opt || fb.opt }
							: { t: (fa ?? fb)!.t, opt: true }
					);
				}
				return { k: 'obj', fields, nullable };
			}
			return { ...a, nullable };
		}
		if ((a.k === 'int' && b.k === 'float') || (a.k === 'float' && b.k === 'int'))
			return { k: 'float', nullable };
		return { k: 'any', nullable };
	}

	const pascal = (s: string) =>
		splitWords(s)
			.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
			.join('') || 'Item';
	const snake = (s: string) =>
		splitWords(s)
			.map((w) => w.toLowerCase())
			.join('_') || 'field';
	const camel = (s: string) => {
		const p = pascal(s);
		return p.charAt(0).toLowerCase() + p.slice(1);
	};
	const singular = (s: string) =>
		s
			.replace(/ies$/i, 'y')
			.replace(/(ss|us)$/i, '$1')
			.replace(/s$/i, '');

	// Beri nama setiap objek (post-order: anak sebelum induk) dan kumpulkan untuk di-emit.
	function collect(root: Ty, name: string): Ty[] {
		const out: Ty[] = [];
		const used = new Set<string>();
		const visit = (t: Ty, hint: string) => {
			if (t.k === 'arr') return visit(t.of!, singular(hint));
			if (t.k !== 'obj') return;
			for (const [key, f] of t.fields!) visit(f.t, key);
			let n = pascal(hint);
			for (let i = 2; used.has(n); i++) n = pascal(hint) + i;
			used.add(n);
			t.name = n;
			out.push(t);
		};
		visit(root, name);
		return out;
	}

	const tsIdent = (k: string) => (/^[A-Za-z_$][\w$]*$/.test(k) ? k : JSON.stringify(k));

	function ts(t: Ty): string {
		const base = (() => {
			switch (t.k) {
				case 'str':
					return 'string';
				case 'int':
				case 'float':
					return 'number';
				case 'bool':
					return 'boolean';
				case 'null':
					return 'null';
				case 'any':
					return 'unknown';
				case 'arr': {
					const inner = ts(t.of!);
					return /[ |]/.test(inner) ? `(${inner})[]` : `${inner}[]`;
				}
				case 'obj':
					return t.name!;
			}
		})();
		return t.nullable && t.k !== 'null' ? `${base} | null` : base;
	}

	function zod(t: Ty): string {
		const base = (() => {
			switch (t.k) {
				case 'str':
					return 'z.string()';
				case 'int':
					return 'z.number().int()';
				case 'float':
					return 'z.number()';
				case 'bool':
					return 'z.boolean()';
				case 'null':
					return 'z.null()';
				case 'any':
					return 'z.unknown()';
				case 'arr':
					return `z.array(${zod(t.of!)})`;
				case 'obj':
					return `${t.name}Schema`;
			}
		})();
		return t.nullable && t.k !== 'null' ? `${base}.nullable()` : base;
	}

	function go(t: Ty): string {
		switch (t.k) {
			case 'str':
				return t.nullable ? '*string' : 'string';
			case 'int':
				return t.nullable ? '*int64' : 'int64';
			case 'float':
				return t.nullable ? '*float64' : 'float64';
			case 'bool':
				return t.nullable ? '*bool' : 'bool';
			case 'null':
			case 'any':
				return 'any';
			case 'arr':
				return `[]${go(t.of!)}`;
			case 'obj':
				return t.nullable ? `*${t.name}` : t.name!;
		}
	}

	function rust(t: Ty, opt = false): string {
		const base = (() => {
			switch (t.k) {
				case 'str':
					return 'String';
				case 'int':
					return 'i64';
				case 'float':
					return 'f64';
				case 'bool':
					return 'bool';
				case 'null':
				case 'any':
					return 'serde_json::Value';
				case 'arr':
					return `Vec<${rust(t.of!)}>`;
				case 'obj':
					return t.name!;
			}
		})();
		return (t.nullable || opt) && t.k !== 'null' && t.k !== 'any' ? `Option<${base}>` : base;
	}

	function py(t: Ty): string {
		const base = (() => {
			switch (t.k) {
				case 'str':
					return 'str';
				case 'int':
					return 'int';
				case 'float':
					return 'float';
				case 'bool':
					return 'bool';
				case 'null':
					return 'None';
				case 'any':
					return 'Any';
				case 'arr':
					return `list[${py(t.of!)}]`;
				case 'obj':
					return t.name!;
			}
		})();
		return t.nullable && t.k !== 'null' ? `${base} | None` : base;
	}

	function php(t: Ty): string {
		const base = {
			str: 'string',
			int: 'int',
			float: 'float',
			bool: 'bool',
			null: 'mixed',
			any: 'mixed',
			arr: 'array',
			obj: t.name!
		}[t.k];
		return t.nullable && base !== 'mixed' ? `?${base}` : base;
	}

	function phpDoc(t: Ty): string {
		if (t.k === 'arr') return `${phpDoc(t.of!)}[]`;
		return php(t).replace(/^\?/, '');
	}

	function emit(model: Ty[], root: Ty): string {
		const fields = (t: Ty) => [...t.fields!];
		switch (lang) {
			case 'ts': {
				const body = model.map(
					(t) =>
						`export interface ${t.name} {\n${fields(t)
							.map(([k, f]) => `  ${tsIdent(k)}${f.opt ? '?' : ''}: ${ts(f.t)};`)
							.join('\n')}\n}`
				);
				if (root.k !== 'obj') body.push(`export type ${pascal(rootName)} = ${ts(root)};`);
				return body.join('\n\n');
			}
			case 'zod': {
				const body = model.map(
					(t) =>
						`export const ${t.name}Schema = z.object({\n${fields(t)
							.map(([k, f]) => `  ${tsIdent(k)}: ${zod(f.t)}${f.opt ? '.optional()' : ''},`)
							.join('\n')}\n});\nexport type ${t.name} = z.infer<typeof ${t.name}Schema>;`
				);
				if (root.k !== 'obj') body.push(`export const ${pascal(rootName)}Schema = ${zod(root)};`);
				return `import { z } from 'zod';\n\n${body.join('\n\n')}`;
			}
			case 'go': {
				const body = model.map((t) => {
					const rows = fields(t).map(([k, f]) => [
						pascal(k).replace(/Id$/, 'ID').replace(/Url$/, 'URL'),
						go(f.t),
						`\`json:"${k}${f.opt ? ',omitempty' : ''}"\``
					]);
					const w0 = Math.max(...rows.map((r) => r[0].length));
					const w1 = Math.max(...rows.map((r) => r[1].length));
					return `type ${t.name} struct {\n${rows.map(([a, b, c]) => `\t${a.padEnd(w0)} ${b.padEnd(w1)} ${c}`).join('\n')}\n}`;
				});
				if (root.k !== 'obj') body.push(`type ${pascal(rootName)} ${go(root)}`);
				return body.join('\n\n');
			}
			case 'rust': {
				const body = model.map(
					(t) =>
						`#[derive(Debug, Clone, Serialize, Deserialize)]\npub struct ${t.name} {\n${fields(t)
							.map(([k, f]) => {
								const name = snake(k);
								const attrs = [
									name !== k ? `rename = "${k}"` : '',
									f.opt ? 'default, skip_serializing_if = "Option::is_none"' : ''
								].filter(Boolean);
								return `${attrs.length ? `    #[serde(${attrs.join(', ')})]\n` : ''}    pub ${['type', 'ref', 'match', 'fn', 'mod', 'use', 'impl'].includes(name) ? `r#${name}` : name}: ${rust(f.t, f.opt)},`;
							})
							.join('\n')}\n}`
				);
				if (root.k !== 'obj') body.push(`pub type ${pascal(rootName)} = ${rust(root)};`);
				return `use serde::{Deserialize, Serialize};\n\n${body.join('\n\n')}`;
			}
			case 'python': {
				const body = model.map(
					(t) =>
						`class ${t.name}(BaseModel):\n${
							fields(t)
								.map(([k, f]) => {
									const name = snake(k);
									const type = py(f.t) + (f.opt && !f.t.nullable ? ' | None' : '');
									const dflt = f.opt || f.t.nullable ? ' = None' : '';
									return name !== k
										? `    ${name}: ${type} = Field(${dflt ? 'None, ' : ''}alias="${k}")`
										: `    ${name}: ${type}${dflt}`;
								})
								.join('\n') || '    pass'
						}`
				);
				if (root.k !== 'obj') body.push(`${pascal(rootName)} = ${py(root)}`);
				return `from __future__ import annotations\n\nfrom typing import Any\n\nfrom pydantic import BaseModel, Field\n\n\n${body.join('\n\n\n')}`;
			}
			case 'php': {
				const body = model.map((t) => {
					const params = fields(t).map(([k, f]) => {
						const type =
							f.opt && !php(f.t).startsWith('?') && php(f.t) !== 'mixed'
								? `?${php(f.t)}`
								: php(f.t);
						const doc = f.t.k === 'arr' ? `        /** @var ${phpDoc(f.t)} */\n` : '';
						return `${doc}        public readonly ${type} $${camel(k)}${f.opt || type.startsWith('?') ? ' = null' : ''},`;
					});
					return `final class ${t.name}\n{\n    public function __construct(\n${params.join('\n')}\n    ) {\n    }\n}`;
				});
				return `<?php\n\ndeclare(strict_types=1);\n\n${body.join('\n\n')}`;
			}
		}
	}

	const out = $derived.by(() => {
		if (!input.trim()) return { value: '', error: null };
		try {
			const root = infer(JSON.parse(input));
			const model = collect(root, rootName || 'Root');
			return { value: emit(model, root), error: null };
		} catch (e) {
			return { value: '', error: errorMessage(e) };
		}
	});
</script>

<ToolHeader slug="json-to-code" />

<div class="space-y-3">
	<div class="flex flex-wrap items-end gap-3">
		<Segmented
			bind:value={lang}
			options={[
				{ value: 'ts', label: 'TypeScript' },
				{ value: 'zod', label: 'Zod' },
				{ value: 'go', label: 'Go' },
				{ value: 'rust', label: 'Rust' },
				{ value: 'python', label: 'Pydantic' },
				{ value: 'php', label: 'PHP' }
			]}
			ariaLabel="Target language"
		/>
		<div class="grid gap-1.5">
			<Label for="j2c-root" class="text-xs">Root type name</Label>
			<Input id="j2c-root" class="h-8 w-40 font-mono" bind:value={rootName} />
		</div>
	</div>
	<div class="grid gap-4 lg:grid-cols-2">
		<TextInput bind:value={input} label="JSON" height="h-[28rem]" />
		<Output value={out.value} error={out.error} label="Code" height="h-[28rem]" wrap={false} />
	</div>
	<p class="text-muted-foreground text-xs">
		Array items are merged: keys missing from some items become optional, null values make a field
		nullable, int + float widen to float.
	</p>
</div>
