// Registry Tools — dipakai oleh /tools (index + tab kategori), ToolHeader, dan command palette.
// Semua tool berjalan 100% di browser; tidak ada data yang dikirim ke server.
export type ToolCategory = 'dev' | 'converters' | 'media' | 'text' | 'generators';

export interface Tool {
	slug: string;
	label: string;
	description: string;
	category: ToolCategory;
	keywords: string[];
}

export const categories: { id: ToolCategory; label: string }[] = [
	{ id: 'dev', label: 'Development Tools' },
	{ id: 'converters', label: 'Converters' },
	{ id: 'media', label: 'Media' },
	{ id: 'text', label: 'Text Tools' },
	{ id: 'generators', label: 'Generators' }
];

export const tools: Tool[] = [
	// ── Development Tools ─────────────────────────────────────────────
	{
		slug: 'json',
		label: 'JSON Viewer',
		description: 'Tree view, format, minify, validate, and sort JSON keys.',
		category: 'dev',
		keywords: ['format', 'prettify', 'minify', 'validate', 'beautify', 'tree']
	},
	{
		slug: 'playground',
		label: 'Code Playground',
		description: 'Live JS / HTML / CSS sandbox, plus JSON and Markdown preview.',
		category: 'dev',
		keywords: ['javascript', 'html', 'css', 'markdown', 'sandbox', 'repl', 'console']
	},
	{
		slug: 'regex',
		label: 'Regex Tester',
		description: 'Test regex patterns with match highlighting and capture groups.',
		category: 'dev',
		keywords: ['regexp', 'pattern', 'match', 'group']
	},
	{
		slug: 'json-to-code',
		label: 'JSON to Code',
		description: 'Generate TypeScript, Zod, Go, Rust, Python, and PHP types from JSON.',
		category: 'dev',
		keywords: ['typescript', 'interface', 'go', 'struct', 'rust', 'serde', 'python', 'zod', 'types']
	},
	{
		slug: 'json-schema',
		label: 'JSON Schema Validator',
		description: 'Validate JSON against a JSON Schema (draft-07 / 2019-09 / 2020-12).',
		category: 'dev',
		keywords: ['schema', 'ajv', 'validate', 'draft']
	},
	{
		slug: 'json-diff',
		label: 'JSON Diff',
		description: 'Structural diff of two JSON documents — added, removed, changed paths.',
		category: 'dev',
		keywords: ['compare', 'diff', 'delta', 'patch']
	},
	{
		slug: 'html-preview',
		label: 'HTML Preview',
		description: 'Render HTML in a sandboxed frame at mobile, tablet, or desktop width.',
		category: 'dev',
		keywords: ['html', 'render', 'iframe', 'responsive', 'email']
	},
	{
		slug: 'formatter',
		label: 'Code Formatter',
		description: 'Prettier in the browser: JS, TS, CSS, SCSS, HTML, Markdown, YAML, GraphQL.',
		category: 'dev',
		keywords: ['prettier', 'beautify', 'format', 'typescript', 'css', 'yaml', 'graphql']
	},
	{
		slug: 'semver',
		label: 'Semver Calculator',
		description: 'Parse, compare, bump versions, and test ranges like ^1.2 || ~2.0.',
		category: 'dev',
		keywords: ['version', 'range', 'npm', 'bump', 'caret', 'tilde']
	},
	{
		slug: 'xml',
		label: 'XML Inspector',
		description: 'Validate, pretty-print, browse as a tree, and query XML with XPath.',
		category: 'dev',
		keywords: ['xml', 'xpath', 'format', 'tree', 'soap', 'rss']
	},
	{
		slug: 'mermaid',
		label: 'Mermaid Renderer',
		description: 'Live-render Mermaid flowcharts, sequence, ER, and state diagrams.',
		category: 'dev',
		keywords: ['diagram', 'flowchart', 'sequence', 'chart', 'uml']
	},
	{
		slug: 'dbml',
		label: 'DB Diagram',
		description: 'Write DBML tables & refs, get an ER diagram plus SQL DDL.',
		category: 'dev',
		keywords: ['dbml', 'erd', 'database', 'schema', 'sql', 'table', 'dbdiagram']
	},

	// ── Converters ────────────────────────────────────────────────────
	{
		slug: 'base64',
		label: 'Base64',
		description: 'Base64 / Base64URL for UTF-8 text and files (data URI).',
		category: 'converters',
		keywords: ['base64', 'base64url', 'encode', 'decode', 'data uri', 'file']
	},
	{
		slug: 'case',
		label: 'Case Converter',
		description: 'camelCase, PascalCase, snake_case, kebab-case, CONSTANT, Title, and more.',
		category: 'converters',
		keywords: ['camel', 'pascal', 'snake', 'kebab', 'upper', 'lower', 'title']
	},
	{
		slug: 'number-base',
		label: 'Number Base',
		description: 'Convert between binary, octal, decimal, hex, and any base 2–36.',
		category: 'converters',
		keywords: ['binary', 'hex', 'octal', 'decimal', 'radix', 'bigint']
	},
	{
		slug: 'markdown',
		label: 'Markdown',
		description: 'Markdown → HTML with live preview (GFM).',
		category: 'converters',
		keywords: ['md', 'html', 'gfm', 'preview']
	},
	{
		slug: 'url',
		label: 'URL Encoder',
		description: 'Encode/decode URLs and components, and break a URL into its parts.',
		category: 'converters',
		keywords: ['uri', 'percent', 'query', 'params', 'encodeURIComponent']
	},
	{
		slug: 'csv-json',
		label: 'CSV to JSON',
		description: 'CSV ↔ JSON with delimiter detection, headers, and type inference.',
		category: 'converters',
		keywords: ['csv', 'tsv', 'json', 'table', 'spreadsheet']
	},
	{
		slug: 'config',
		label: 'Config Converter',
		description: 'Convert between JSON, YAML, TOML, and .env.',
		category: 'converters',
		keywords: ['yaml', 'yml', 'toml', 'json', 'env', 'dotenv']
	},
	{
		slug: 'escape',
		label: 'Escape Tools',
		description: 'Escape / unescape HTML, XML, JS, JSON, SQL, CSV, regex, shell, Unicode.',
		category: 'converters',
		keywords: ['escape', 'unescape', 'entity', 'html', 'string', 'quote', 'unicode']
	},
	{
		slug: 'html-jsx',
		label: 'HTML to JSX',
		description: 'Convert HTML markup into valid JSX (className, style objects, self-closing).',
		category: 'converters',
		keywords: ['react', 'jsx', 'html', 'classname', 'tsx']
	},
	{
		slug: 'svg-css',
		label: 'SVG to CSS',
		description: 'Turn SVG into an optimized data URI for background-image or mask.',
		category: 'converters',
		keywords: ['svg', 'css', 'data uri', 'background', 'mask', 'icon']
	},
	{
		slug: 'php',
		label: 'PHP Tools',
		description: 'PHP serialize / unserialize and JSON ↔ PHP array syntax.',
		category: 'converters',
		keywords: ['php', 'serialize', 'unserialize', 'array', 'var_export']
	},
	{
		slug: 'compression',
		label: 'Compression',
		description: 'Gzip / Deflate text or files with native CompressionStream.',
		category: 'converters',
		keywords: ['gzip', 'deflate', 'zlib', 'compress', 'decompress', 'gz']
	},
	{
		slug: 'curl',
		label: 'cURL to Code',
		description: 'Convert a curl command into fetch, axios, Python, Go, PHP, or HTTPie.',
		category: 'converters',
		keywords: ['curl', 'fetch', 'axios', 'requests', 'http', 'python', 'go']
	},
	{
		slug: 'time',
		label: 'Epoch / Date',
		description: 'Convert Unix timestamps (s/ms) ↔ ISO & local time.',
		category: 'converters',
		keywords: ['timestamp', 'unix', 'epoch', 'date', 'iso', 'waktu']
	},

	// ── Media ─────────────────────────────────────────────────────────
	{
		slug: 'color',
		label: 'Color Palette',
		description: 'OKLCH shade scales, color harmonies, image palette extraction, contrast check.',
		category: 'media',
		keywords: ['warna', 'palette', 'shade', 'oklch', 'contrast', 'tailwind', 'hex']
	},
	{
		slug: 'image',
		label: 'Image Converter',
		description: 'Convert PNG ↔ JPG ↔ WebP and compress (TinyPNG-style quantization).',
		category: 'media',
		keywords: ['tinypng', 'compress', 'png', 'jpg', 'jpeg', 'webp', 'gambar', 'resize', 'convert']
	},
	{
		slug: 'qr-reader',
		label: 'QR Reader',
		description: 'Decode QR codes from an image, the clipboard, or your camera.',
		category: 'media',
		keywords: ['qr', 'scan', 'barcode', 'camera', 'decode']
	},

	// ── Text Tools ────────────────────────────────────────────────────
	{
		slug: 'text-compare',
		label: 'Text Compare',
		description: 'Side-by-side or inline diff of two texts by line, word, or character.',
		category: 'text',
		keywords: ['diff', 'compare', 'difference', 'merge']
	},
	{
		slug: 'jwt',
		label: 'JWT Decoder',
		description: 'Inspect JWT header & payload along with expiry status.',
		category: 'text',
		keywords: ['token', 'jwt', 'decode', 'bearer', 'exp']
	},
	{
		slug: 'api-formatter',
		label: 'API Formatter',
		description: 'Paste a raw HTTP response or body — auto-detects JSON, XML, form data.',
		category: 'text',
		keywords: ['api', 'response', 'http', 'headers', 'body', 'format']
	},
	{
		slug: 'string-inspector',
		label: 'String Inspector',
		description: 'Counts, bytes, code points, and hidden/invisible character detection.',
		category: 'text',
		keywords: ['count', 'length', 'unicode', 'bytes', 'zero-width', 'invisible', 'words']
	},
	{
		slug: 'line-tools',
		label: 'Line Tools',
		description: 'Sort, dedupe, reverse, shuffle, trim, number, prefix/suffix lines.',
		category: 'text',
		keywords: ['sort', 'unique', 'dedupe', 'lines', 'shuffle', 'reverse', 'trim']
	},

	// ── Generators ────────────────────────────────────────────────────
	{
		slug: 'hash',
		label: 'Hash Generator',
		description: 'MD5, SHA-1, SHA-256/384/512 for text or files.',
		category: 'generators',
		keywords: ['md5', 'sha', 'sha256', 'checksum', 'digest']
	},
	{
		slug: 'uuid',
		label: 'UUID Generator',
		description: 'Generate UUID v4 and v7 (time-ordered), in bulk.',
		category: 'generators',
		keywords: ['guid', 'id', 'random', 'v4', 'v7']
	},
	{
		slug: 'password',
		label: 'Password Generator',
		description: 'Cryptographically random passwords with entropy estimate.',
		category: 'generators',
		keywords: ['password', 'secure', 'random', 'entropy', 'passphrase']
	},
	{
		slug: 'lorem',
		label: 'Lorem Ipsum',
		description: 'Placeholder paragraphs, sentences, or words — plain text or HTML.',
		category: 'generators',
		keywords: ['lorem', 'ipsum', 'placeholder', 'dummy', 'text']
	},
	{
		slug: 'qr',
		label: 'QR Generator',
		description: 'QR codes for text, URLs, Wi-Fi — download PNG or SVG.',
		category: 'generators',
		keywords: ['qr', 'qrcode', 'wifi', 'png', 'svg']
	},
	{
		slug: 'bcrypt',
		label: 'Bcrypt Generator',
		description: 'Hash passwords with bcrypt and verify a hash against plaintext.',
		category: 'generators',
		keywords: ['bcrypt', 'hash', 'password', 'verify', 'salt']
	},
	{
		slug: 'random-string',
		label: 'Random String',
		description: 'Random alphanumeric, hex, base64url, numeric, or custom-charset strings.',
		category: 'generators',
		keywords: ['random', 'token', 'secret', 'hex', 'nanoid', 'api key']
	},
	{
		slug: 'keypair',
		label: 'Key Pair Generator',
		description: 'RSA, ECDSA, and Ed25519 key pairs as PEM and JWK via WebCrypto.',
		category: 'generators',
		keywords: ['rsa', 'ecdsa', 'ed25519', 'pem', 'jwk', 'public key', 'private key']
	}
];

export function toolsIn(category: ToolCategory): Tool[] {
	return tools.filter((t) => t.category === category);
}
