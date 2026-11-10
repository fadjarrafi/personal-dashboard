<script lang="ts">
	import ToolHeader from '$lib/components/tools/ToolHeader.svelte';
	import Segmented from '$lib/components/tools/Segmented.svelte';
	import TextInput from '$lib/components/tools/TextInput.svelte';
	import Output from '$lib/components/tools/Output.svelte';
	import MermaidLive from '$lib/components/tools/MermaidLive.svelte';
	import { NativeSelect } from '$lib/components/ui/native-select/index.js';
	import { errorMessage } from '$lib/tool-utils';

	let input = $state(`// DBML — https://dbml.dbdiagram.io/docs
Table users {
  id integer [pk, increment]
  email varchar(255) [not null, unique]
  role user_role [default: 'user']
  created_at timestamp [default: \`now()\`]
}

Table items {
  id integer [pk, increment]
  user_id integer [not null, ref: > users.id]
  type varchar(20) [not null, note: 'bookmark | note | snippet']
  title text
}

Table tags {
  id integer [pk]
  name varchar(64) [unique]
}

Table item_tags {
  item_id integer [ref: > items.id]
  tag_id integer [ref: > tags.id]
}

Enum user_role {
  admin
  user
}
`);
	let view = $state<'diagram' | 'sql' | 'mermaid'>('diagram');
	let dialect = $state<'postgres' | 'mysql' | 'sqlite'>('postgres');

	interface Column {
		name: string;
		type: string;
		pk: boolean;
		notNull: boolean;
		unique: boolean;
		increment: boolean;
		dflt: string | null;
		note: string | null;
	}
	interface Table {
		name: string;
		columns: Column[];
	}
	interface Ref {
		from: [string, string];
		to: [string, string];
		op: '>' | '<' | '-' | '<>';
	}

	const unq = (s: string) => s.trim().replace(/^"(.*)"$/, '$1');

	function splitSettings(s: string): string[] {
		// Pisah "[a, b: 'x, y', c]" pada koma di luar quote/backtick.
		const out: string[] = [];
		let cur = '';
		let q: string | null = null;
		for (const c of s) {
			if (q) {
				if (c === q) q = null;
				cur += c;
			} else if (c === "'" || c === '`' || c === '"') {
				q = c;
				cur += c;
			} else if (c === ',') {
				out.push(cur.trim());
				cur = '';
			} else cur += c;
		}
		if (cur.trim()) out.push(cur.trim());
		return out;
	}

	function parseEndpoint(s: string): [string, string] {
		const parts = s.trim().split('.').map(unq);
		if (parts.length < 2) throw new Error(`Ref endpoint “${s.trim()}” must be table.column`);
		return [parts.slice(0, -1).join('.'), parts[parts.length - 1]];
	}

	function parse(src: string) {
		const text = src.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
		const tables: Table[] = [];
		const refs: Ref[] = [];
		const enums: Record<string, string[]> = {};

		// Blok Table dicari dengan menghitung kurung kurawal (blok indexes { } bisa bersarang).
		const tableBlocks: [string, string][] = [];
		for (const m of text.matchAll(
			/\bTable\s+("[^"]+"|[\w.]+)(?:\s+as\s+\w+)?\s*(?:\[[^\]]*\])?\s*\{/gi
		)) {
			let depth = 1;
			let i = m.index! + m[0].length;
			const start = i;
			for (; i < text.length && depth; i++) {
				if (text[i] === '{') depth++;
				else if (text[i] === '}') depth--;
			}
			if (depth) throw new Error(`Table ${unq(m[1])} is missing a closing “}”`);
			tableBlocks.push([m[1], text.slice(start, i - 1)]);
		}
		for (const [rawName, body] of tableBlocks) {
			const m = [null, rawName, body] as const;
			const t: Table = { name: unq(m[1]), columns: [] };
			let inIndexes = false;
			for (const raw of m[2].split('\n')) {
				const line = raw.trim();
				if (!line) continue;
				if (/^indexes\s*\{/i.test(line)) {
					inIndexes = true;
					continue;
				}
				if (inIndexes) {
					if (line.startsWith('}')) inIndexes = false;
					continue;
				}
				if (/^note\s*:/i.test(line)) continue;
				const cm = line.match(
					/^("[^"]+"|\w+)\s+("[^"]+"|[\w.]+(?:\([^)]*\))?(?:\[\])?)\s*(?:\[(.*)\])?\s*$/
				);
				if (!cm) throw new Error(`Cannot parse column in ${t.name}: “${line}”`);
				const col: Column = {
					name: unq(cm[1]),
					type: unq(cm[2]),
					pk: false,
					notNull: false,
					unique: false,
					increment: false,
					dflt: null,
					note: null
				};
				for (const s of cm[3] ? splitSettings(cm[3]) : []) {
					const lower = s.toLowerCase();
					if (lower === 'pk' || lower === 'primary key') col.pk = true;
					else if (lower === 'not null') col.notNull = true;
					else if (lower === 'unique') col.unique = true;
					else if (lower === 'increment') col.increment = true;
					else if (lower.startsWith('default:')) col.dflt = s.slice(8).trim();
					else if (lower.startsWith('note:'))
						col.note = s
							.slice(5)
							.trim()
							.replace(/^'(.*)'$/, '$1');
					else if (lower.startsWith('ref:')) {
						const r = s
							.slice(4)
							.trim()
							.match(/^(<>|>|<|-)\s*(.+)$/);
						if (r)
							refs.push({
								from: [t.name, col.name],
								op: r[1] as Ref['op'],
								to: parseEndpoint(r[2])
							});
					}
				}
				t.columns.push(col);
			}
			tables.push(t);
		}

		for (const m of text.matchAll(/\bRef\s*\w*\s*:\s*([\w."]+)\s*(<>|>|<|-)\s*([\w."]+)/gi)) {
			refs.push({ from: parseEndpoint(m[1]), op: m[2] as Ref['op'], to: parseEndpoint(m[3]) });
		}
		for (const m of text.matchAll(/\bRef\s*\w*\s*\{\s*([\w."]+)\s*(<>|>|<|-)\s*([\w."]+)/gi)) {
			refs.push({ from: parseEndpoint(m[1]), op: m[2] as Ref['op'], to: parseEndpoint(m[3]) });
		}
		for (const m of text.matchAll(/\bEnum\s+("[^"]+"|[\w.]+)\s*\{([\s\S]*?)\}/gi)) {
			enums[unq(m[1])] = m[2]
				.split('\n')
				.map((l) => unq(l.replace(/\[.*\]/, '').trim()))
				.filter(Boolean);
		}
		if (!tables.length) throw new Error('No Table blocks found');
		const names = new Set(tables.map((t) => t.name));
		for (const r of refs) {
			for (const [tbl] of [r.from, r.to])
				if (!names.has(tbl)) throw new Error(`Ref points to unknown table “${tbl}”`);
		}
		return { tables, refs, enums };
	}

	const ident = (s: string) => s.replace(/[^\w]/g, '_');
	const mType = (s: string) =>
		s.replace(/\(([^)]*)\)/, (_m, a) => `_${a.replace(/\W+/g, '_')}`).replace(/[^\w\[\]-]/g, '_');

	function toMermaid({ tables, refs }: ReturnType<typeof parse>): string {
		const fks = new Set(
			refs.flatMap((r) =>
				r.op === '<' ? [`${r.to[0]}.${r.to[1]}`] : [`${r.from[0]}.${r.from[1]}`]
			)
		);
		const lines = ['erDiagram'];
		for (const t of tables) {
			lines.push(`  ${ident(t.name)} {`);
			for (const c of t.columns) {
				const keys = [
					c.pk && 'PK',
					fks.has(`${t.name}.${c.name}`) && 'FK',
					c.unique && !c.pk && 'UK'
				]
					.filter(Boolean)
					.join(', ');
				const note = c.note ? ` "${c.note.replace(/"/g, "'")}"` : '';
				lines.push(`    ${mType(c.type)} ${ident(c.name)}${keys ? ' ' + keys : ''}${note}`);
			}
			lines.push('  }');
		}
		for (const r of refs) {
			// a.x > b.y  →  banyak a ke satu b.
			const [many, one] = r.op === '<' ? [r.to, r.from] : [r.from, r.to];
			const card = r.op === '-' ? '||--||' : r.op === '<>' ? '}o--o{' : '}o--||';
			lines.push(`  ${ident(many[0])} ${card} ${ident(one[0])} : "${many[1]}"`);
		}
		return lines.join('\n');
	}

	function toSql({ tables, refs, enums }: ReturnType<typeof parse>): string {
		const q = (s: string) => (dialect === 'mysql' ? `\`${s}\`` : `"${s}"`);
		const out: string[] = [];
		if (dialect === 'postgres')
			for (const [name, vals] of Object.entries(enums))
				out.push(`CREATE TYPE ${q(name)} AS ENUM (${vals.map((v) => `'${v}'`).join(', ')});`);
		for (const t of tables) {
			const pks = t.columns.filter((c) => c.pk);
			const defs = t.columns.map((c) => {
				let type = c.type;
				if (enums[type] && dialect !== 'postgres')
					type =
						dialect === 'mysql' ? `ENUM(${enums[type].map((v) => `'${v}'`).join(', ')})` : 'TEXT';
				else if (dialect === 'postgres' && enums[type]) type = q(type);
				if (c.increment)
					type =
						dialect === 'postgres'
							? /big/i.test(type)
								? 'BIGSERIAL'
								: 'SERIAL'
							: dialect === 'sqlite'
								? 'INTEGER'
								: type;
				const parts = [`  ${q(c.name)} ${type}`];
				if (c.pk && pks.length === 1) parts.push('PRIMARY KEY');
				if (c.increment && dialect === 'mysql') parts.push('AUTO_INCREMENT');
				if (c.increment && dialect === 'sqlite' && c.pk) parts.push('AUTOINCREMENT');
				if (c.notNull && !c.pk) parts.push('NOT NULL');
				if (c.unique && !c.pk) parts.push('UNIQUE');
				if (c.dflt !== null) parts.push(`DEFAULT ${c.dflt.replace(/^`(.*)`$/, '$1')}`);
				return parts.join(' ');
			});
			if (pks.length > 1) defs.push(`  PRIMARY KEY (${pks.map((c) => q(c.name)).join(', ')})`);
			if (dialect === 'sqlite') {
				for (const r of refs) {
					const [src, dst] = r.op === '<' ? [r.to, r.from] : [r.from, r.to];
					if (src[0] === t.name && r.op !== '<>')
						defs.push(`  FOREIGN KEY (${q(src[1])}) REFERENCES ${q(dst[0])} (${q(dst[1])})`);
				}
			}
			out.push(`CREATE TABLE ${q(t.name)} (\n${defs.join(',\n')}\n);`);
		}
		if (dialect !== 'sqlite') {
			for (const r of refs) {
				if (r.op === '<>') {
					out.push(
						`-- many-to-many ${r.from.join('.')} <> ${r.to.join('.')}: create a junction table`
					);
					continue;
				}
				const [src, dst] = r.op === '<' ? [r.to, r.from] : [r.from, r.to];
				out.push(
					`ALTER TABLE ${q(src[0])} ADD FOREIGN KEY (${q(src[1])}) REFERENCES ${q(dst[0])} (${q(dst[1])});`
				);
			}
		}
		return out.join('\n\n');
	}

	const result = $derived.by(() => {
		try {
			const model = parse(input);
			return {
				mermaid: toMermaid(model),
				sql: toSql(model),
				error: null,
				info: `${model.tables.length} tables · ${model.refs.length} refs`
			};
		} catch (e) {
			return { mermaid: '', sql: '', error: errorMessage(e), info: '' };
		}
	});

	// Simpan diagram terakhir yang valid supaya preview tidak berkedip saat sedang mengetik.
	let lastGood = $state('');
	$effect(() => {
		if (result.mermaid) lastGood = result.mermaid;
	});
</script>

<ToolHeader slug="dbml" />

<div class="space-y-3">
	<div class="flex flex-wrap items-center gap-3">
		<Segmented
			bind:value={view}
			options={[
				{ value: 'diagram', label: 'Diagram' },
				{ value: 'sql', label: 'SQL DDL' },
				{ value: 'mermaid', label: 'Mermaid' }
			]}
			ariaLabel="Output"
		/>
		{#if view === 'sql'}
			<NativeSelect size="sm" bind:value={dialect} aria-label="SQL dialect">
				<option value="postgres">PostgreSQL</option>
				<option value="mysql">MySQL</option>
				<option value="sqlite">SQLite</option>
			</NativeSelect>
		{/if}
		{#if result.info}<span class="text-muted-foreground text-xs">{result.info}</span>{/if}
	</div>
	<div class="grid gap-4 xl:grid-cols-2">
		<TextInput bind:value={input} label="DBML" height="h-[32rem]" />
		{#if view === 'diagram'}
			<div class="space-y-2">
				{#if result.error}<p role="alert" class="text-destructive text-sm">{result.error}</p>{/if}
				<MermaidLive source={lastGood} filename="db-diagram.svg" />
			</div>
		{:else}
			<Output
				value={view === 'sql' ? result.sql : result.mermaid}
				error={result.error}
				label={view === 'sql' ? 'SQL' : 'Mermaid erDiagram'}
				height="h-[32rem]"
				wrap={false}
			/>
		{/if}
	</div>
</div>
