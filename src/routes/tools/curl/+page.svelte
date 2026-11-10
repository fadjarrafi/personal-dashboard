<script lang="ts">
	import ToolHeader from '$lib/components/tools/ToolHeader.svelte';
	import Segmented from '$lib/components/tools/Segmented.svelte';
	import TextInput from '$lib/components/tools/TextInput.svelte';
	import Output from '$lib/components/tools/Output.svelte';
	import { errorMessage } from '$lib/tool-utils';

	type Target = 'fetch' | 'axios' | 'python' | 'go' | 'php' | 'httpie';

	let target = $state<Target>('fetch');
	let input = $state(`curl -X POST 'https://api.example.com/v1/items?limit=10' \\
  -H 'Content-Type: application/json' \\
  -H 'Authorization: Bearer TOKEN' \\
  --data-raw '{"title":"Hello","tags":["a","b"]}'`);

	interface Req {
		method: string;
		url: string;
		headers: [string, string][];
		body: string | null;
		form: [string, string][];
		auth: [string, string] | null;
		insecure: boolean;
		followRedirects: boolean;
	}

	// Tokenizer shell sederhana: quote tunggal/ganda, backslash, dan line continuation.
	function tokenize(s: string): string[] {
		const out: string[] = [];
		let cur = '';
		let has = false;
		for (let i = 0; i < s.length; i++) {
			const c = s[i];
			if (c === '\\' && (s[i + 1] === '\n' || s[i + 1] === '\r')) {
				i += s[i + 1] === '\r' && s[i + 2] === '\n' ? 2 : 1;
				continue;
			}
			if (/\s/.test(c)) {
				if (has) out.push(cur);
				cur = '';
				has = false;
			} else if (c === "'") {
				const end = s.indexOf("'", i + 1);
				if (end < 0) throw new Error('Unterminated single quote');
				cur += s.slice(i + 1, end);
				i = end;
				has = true;
			} else if (c === '"') {
				i++;
				while (i < s.length && s[i] !== '"') {
					if (s[i] === '\\' && /["\\$`\n]/.test(s[i + 1])) i++;
					cur += s[i++];
				}
				if (i >= s.length) throw new Error('Unterminated double quote');
				has = true;
			} else if (c === '$' && s[i + 1] === "'") {
				// ANSI-C quoting $'...'
				i += 2;
				while (i < s.length && s[i] !== "'") {
					if (s[i] === '\\') {
						const n = s[++i];
						cur +=
							({ n: '\n', t: '\t', r: '\r', "'": "'", '\\': '\\' } as Record<string, string>)[n] ??
							n;
						i++;
					} else cur += s[i++];
				}
				has = true;
			} else if (c === '\\') {
				cur += s[++i] ?? '';
				has = true;
			} else {
				cur += c;
				has = true;
			}
		}
		if (has) out.push(cur);
		return out;
	}

	function parse(cmd: string): Req {
		const t = tokenize(cmd.trim());
		if (t[0] !== 'curl') throw new Error('Command must start with “curl”');
		const r: Req = {
			method: '',
			url: '',
			headers: [],
			body: null,
			form: [],
			auth: null,
			insecure: false,
			followRedirects: false
		};
		const data: string[] = [];
		let get = false;
		for (let i = 1; i < t.length; i++) {
			let a = t[i];
			let val: string | undefined;
			const eq = a.startsWith('--') ? a.indexOf('=') : -1;
			if (eq > 0) {
				val = a.slice(eq + 1);
				a = a.slice(0, eq);
			}
			// Short option dengan nilai menempel: -XPOST, -HAccept:x
			if (/^-[XHdFuAe][^-]/.test(a) && a.length > 2) {
				val = a.slice(2);
				a = a.slice(0, 2);
			}
			const next = () => val ?? t[++i] ?? '';
			switch (a) {
				case '-X':
				case '--request':
					r.method = next().toUpperCase();
					break;
				case '-H':
				case '--header': {
					const h = next();
					const idx = h.indexOf(':');
					if (idx > 0) r.headers.push([h.slice(0, idx).trim(), h.slice(idx + 1).trim()]);
					break;
				}
				case '-d':
				case '--data':
				case '--data-raw':
				case '--data-binary':
				case '--data-ascii':
					data.push(next());
					break;
				case '--data-urlencode': {
					const v = next();
					const k = v.indexOf('=');
					data.push(
						k > 0 ? `${v.slice(0, k)}=${encodeURIComponent(v.slice(k + 1))}` : encodeURIComponent(v)
					);
					break;
				}
				case '--json':
					data.push(next());
					r.headers.push(['Content-Type', 'application/json'], ['Accept', 'application/json']);
					break;
				case '-F':
				case '--form': {
					const v = next();
					const k = v.indexOf('=');
					r.form.push([v.slice(0, k), v.slice(k + 1)]);
					break;
				}
				case '-u':
				case '--user': {
					const v = next();
					const k = v.indexOf(':');
					r.auth = k >= 0 ? [v.slice(0, k), v.slice(k + 1)] : [v, ''];
					break;
				}
				case '-A':
				case '--user-agent':
					r.headers.push(['User-Agent', next()]);
					break;
				case '-e':
				case '--referer':
					r.headers.push(['Referer', next()]);
					break;
				case '-b':
				case '--cookie':
					r.headers.push(['Cookie', next()]);
					break;
				case '-G':
				case '--get':
					get = true;
					break;
				case '-I':
				case '--head':
					r.method = 'HEAD';
					break;
				case '-k':
				case '--insecure':
					r.insecure = true;
					break;
				case '-L':
				case '--location':
					r.followRedirects = true;
					break;
				case '--url':
					r.url = next();
					break;
				case '--compressed':
				case '-s':
				case '--silent':
				case '-v':
				case '--verbose':
				case '-i':
				case '--include':
					break;
				case '-o':
				case '--output':
				case '-m':
				case '--max-time':
				case '--connect-timeout':
					next();
					break;
				default:
					if (!a.startsWith('-') && !r.url) r.url = a;
			}
		}
		if (!r.url) throw new Error('No URL found');
		if (!/^[a-z]+:\/\//i.test(r.url)) r.url = 'http://' + r.url;
		if (data.length) {
			if (get) {
				r.url += (r.url.includes('?') ? '&' : '?') + data.join('&');
			} else {
				r.body = data.join('&');
				if (!r.headers.some(([k]) => k.toLowerCase() === 'content-type'))
					r.headers.push(['Content-Type', 'application/x-www-form-urlencoded']);
			}
		}
		r.method ||= r.body !== null || r.form.length ? 'POST' : 'GET';
		return r;
	}

	const q = (s: string) => JSON.stringify(s);
	const pyStr = (s: string) => (s.includes('\n') ? `"""${s.replace(/"""/g, '\\"""')}"""` : q(s));
	const isJson = (r: Req) =>
		r.body !== null &&
		r.headers.some(([k, v]) => k.toLowerCase() === 'content-type' && v.includes('json')) &&
		(() => {
			try {
				JSON.parse(r.body!);
				return true;
			} catch {
				return false;
			}
		})();

	function gen(r: Req): string {
		const headers = r.auth
			? [
					...r.headers,
					['Authorization', `Basic ${btoa(`${r.auth[0]}:${r.auth[1]}`)}`] as [string, string]
				]
			: r.headers;
		const json = isJson(r);
		switch (target) {
			case 'fetch': {
				const opts: string[] = [];
				if (r.method !== 'GET') opts.push(`  method: ${q(r.method)}`);
				if (headers.length)
					opts.push(
						`  headers: {\n${headers.map(([k, v]) => `    ${q(k)}: ${q(v)}`).join(',\n')}\n  }`
					);
				if (r.form.length) opts.push('  body: form');
				else if (r.body !== null)
					opts.push(
						`  body: ${json ? `JSON.stringify(${JSON.stringify(JSON.parse(r.body), null, 2).replace(/\n/g, '\n  ')})` : q(r.body)}`
					);
				const form = r.form.length
					? `const form = new FormData();\n${r.form.map(([k, v]) => `form.append(${q(k)}, ${v.startsWith('@') ? `/* file: ${v.slice(1)} */ fileInput.files[0]` : q(v)});`).join('\n')}\n\n`
					: '';
				return `${form}const res = await fetch(${q(r.url)}${opts.length ? `, {\n${opts.join(',\n')}\n}` : ''});\nconst data = await res.${json || headers.some(([, v]) => v.includes('json')) ? 'json' : 'text'}();`;
			}
			case 'axios': {
				const lines = [`  method: ${q(r.method.toLowerCase())}`, `  url: ${q(r.url)}`];
				const hs = r.headers;
				if (hs.length)
					lines.push(
						`  headers: {\n${hs.map(([k, v]) => `    ${q(k)}: ${q(v)}`).join(',\n')}\n  }`
					);
				if (r.auth) lines.push(`  auth: { username: ${q(r.auth[0])}, password: ${q(r.auth[1])} }`);
				if (r.body !== null)
					lines.push(
						`  data: ${json ? JSON.stringify(JSON.parse(r.body), null, 2).replace(/\n/g, '\n  ') : q(r.body)}`
					);
				if (r.form.length) lines.push(`  data: form`);
				const form = r.form.length
					? `const form = new FormData();\n${r.form.map(([k, v]) => `form.append(${q(k)}, ${q(v)});`).join('\n')}\n\n`
					: '';
				return `import axios from 'axios';\n\n${form}const { data } = await axios({\n${lines.join(',\n')}\n});`;
			}
			case 'python': {
				const lines = [`    ${q(r.url)}`];
				if (r.headers.length)
					lines.push(
						`    headers={\n${r.headers.map(([k, v]) => `        ${q(k)}: ${q(v)}`).join(',\n')},\n    }`
					);
				if (r.auth) lines.push(`    auth=(${q(r.auth[0])}, ${q(r.auth[1])})`);
				if (json)
					lines.push(
						`    json=${JSON.stringify(JSON.parse(r.body!), null, 4)
							.replace(/\btrue\b/g, 'True')
							.replace(/\bfalse\b/g, 'False')
							.replace(/\bnull\b/g, 'None')
							.replace(/\n/g, '\n    ')}`
					);
				else if (r.body !== null) lines.push(`    data=${pyStr(r.body)}`);
				if (r.form.length) {
					const files = r.form.filter(([, v]) => v.startsWith('@'));
					const fields = r.form.filter(([, v]) => !v.startsWith('@'));
					if (fields.length)
						lines.push(`    data={${fields.map(([k, v]) => `${q(k)}: ${q(v)}`).join(', ')}}`);
					if (files.length)
						lines.push(
							`    files={${files.map(([k, v]) => `${q(k)}: open(${q(v.slice(1))}, "rb")`).join(', ')}}`
						);
				}
				if (r.insecure) lines.push('    verify=False');
				if (!r.followRedirects) lines.push('    allow_redirects=False');
				return `import requests\n\nresp = requests.${r.method.toLowerCase()}(\n${lines.join(',\n')},\n)\nresp.raise_for_status()\nprint(resp.${json ? 'json()' : 'text'})`;
			}
			case 'go': {
				const body =
					r.body !== null
						? `strings.NewReader(${'`'}${r.body.replace(/`/g, '` + "`" + `')}${'`'})`
						: 'nil';
				const hs = r.headers.map(([k, v]) => `\treq.Header.Set(${q(k)}, ${q(v)})`).join('\n');
				const auth = r.auth ? `\n\treq.SetBasicAuth(${q(r.auth[0])}, ${q(r.auth[1])})` : '';
				return `package main

import (
	"fmt"
	"io"
	"net/http"${r.body !== null ? '\n\t"strings"' : ''}
)

func main() {
	req, err := http.NewRequest(${q(r.method)}, ${q(r.url)}, ${body})
	if err != nil {
		panic(err)
	}
${hs}${auth}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		panic(err)
	}
	defer resp.Body.Close()

	b, _ := io.ReadAll(resp.Body)
	fmt.Println(resp.Status, string(b))
}`;
			}
			case 'php': {
				const opts = [
					`    CURLOPT_URL => ${q(r.url)}`,
					'    CURLOPT_RETURNTRANSFER => true',
					`    CURLOPT_CUSTOMREQUEST => ${q(r.method)}`
				];
				if (r.headers.length)
					opts.push(
						`    CURLOPT_HTTPHEADER => [\n${r.headers.map(([k, v]) => `        ${q(`${k}: ${v}`)}`).join(',\n')},\n    ]`
					);
				if (r.body !== null) opts.push(`    CURLOPT_POSTFIELDS => ${q(r.body)}`);
				if (r.form.length)
					opts.push(
						`    CURLOPT_POSTFIELDS => [\n${r.form.map(([k, v]) => `        ${q(k)} => ${v.startsWith('@') ? `new CURLFile(${q(v.slice(1))})` : q(v)}`).join(',\n')},\n    ]`
					);
				if (r.auth) opts.push(`    CURLOPT_USERPWD => ${q(`${r.auth[0]}:${r.auth[1]}`)}`);
				if (r.followRedirects) opts.push('    CURLOPT_FOLLOWLOCATION => true');
				if (r.insecure) opts.push('    CURLOPT_SSL_VERIFYPEER => false');
				return `<?php\n\n$ch = curl_init();\ncurl_setopt_array($ch, [\n${opts.join(',\n')},\n]);\n$response = curl_exec($ch);\n$status = curl_getinfo($ch, CURLINFO_HTTP_CODE);\ncurl_close($ch);\n\necho $response;`;
			}
			case 'httpie': {
				const sh = (s: string) =>
					/^[\w./:@%+=,-]+$/.test(s) ? s : `'${s.replace(/'/g, `'\\''`)}'`;
				const parts = ['http'];
				if (r.form.length) parts.push('--form');
				if (r.insecure) parts.push('--verify=no');
				if (r.followRedirects) parts.push('--follow');
				if (r.auth) parts.push('-a', sh(`${r.auth[0]}:${r.auth[1]}`));
				parts.push(r.method, sh(r.url));
				for (const [k, v] of r.headers) parts.push(sh(`${k}:${v}`));
				for (const [k, v] of r.form)
					parts.push(sh(v.startsWith('@') ? `${k}@${v.slice(1)}` : `${k}=${v}`));
				const cmd = parts.join(' ');
				return r.body !== null ? `echo ${sh(r.body)} | ${cmd}` : cmd;
			}
		}
	}

	const out = $derived.by(() => {
		if (!input.trim()) return { value: '', error: null };
		try {
			return { value: gen(parse(input)), error: null };
		} catch (e) {
			return { value: '', error: errorMessage(e) };
		}
	});
</script>

<ToolHeader slug="curl" />

<div class="space-y-3">
	<Segmented
		bind:value={target}
		options={[
			{ value: 'fetch', label: 'fetch' },
			{ value: 'axios', label: 'axios' },
			{ value: 'python', label: 'Python' },
			{ value: 'go', label: 'Go' },
			{ value: 'php', label: 'PHP' },
			{ value: 'httpie', label: 'HTTPie' }
		]}
		ariaLabel="Target language"
	/>
	<div class="grid gap-4 lg:grid-cols-2">
		<TextInput bind:value={input} label="curl command" height="h-80" />
		<Output value={out.value} error={out.error} label="Code" height="h-80" wrap={false} />
	</div>
	<p class="text-muted-foreground text-xs">
		Supports -X, -H, -d / --data-*, --json, -F, -u, -A, -b, -G, -I, -k, -L and quoted / multi-line
		commands (bash style).
	</p>
</div>
