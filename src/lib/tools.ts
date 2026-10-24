// Registry Dev Toolbox — dipakai oleh /tools (index), sidebar, dan command palette.
// Semua tool berjalan 100% di browser; tidak ada data yang dikirim ke server.
export interface Tool {
	slug: string;
	label: string;
	description: string;
	keywords: string[];
}

export const tools: Tool[] = [
	{
		slug: 'json',
		label: 'JSON',
		description: 'Format, minify, validate, and sort JSON keys.',
		keywords: ['format', 'prettify', 'minify', 'validate', 'beautify']
	},
	{
		slug: 'encode',
		label: 'Encode / Decode',
		description: 'Base64 (UTF-8), URL encoding, and HTML entities.',
		keywords: ['base64', 'url', 'uri', 'html', 'entity', 'escape']
	},
	{
		slug: 'jwt',
		label: 'JWT Decoder',
		description: 'Inspect JWT header & payload along with expiry status.',
		keywords: ['token', 'jwt', 'decode', 'bearer', 'exp']
	},
	{
		slug: 'uuid',
		label: 'UUID',
		description: 'Generate UUID v4 and v7 (time-ordered), in bulk.',
		keywords: ['guid', 'id', 'random', 'v4', 'v7']
	},
	{
		slug: 'time',
		label: 'Epoch / Date',
		description: 'Convert Unix timestamps (s/ms) ↔ ISO & local time.',
		keywords: ['timestamp', 'unix', 'epoch', 'date', 'iso', 'waktu']
	},
	{
		slug: 'regex',
		label: 'Regex Tester',
		description: 'Test regex patterns with match highlighting and capture groups.',
		keywords: ['regexp', 'pattern', 'match', 'group']
	},
	{
		slug: 'hash',
		label: 'Hash',
		description: 'MD5, SHA-1, SHA-256/384/512 for text or files.',
		keywords: ['md5', 'sha', 'sha256', 'checksum', 'digest']
	},
	{
		slug: 'color',
		label: 'Color Palette',
		description: 'OKLCH shade scales, color harmonies, image palette extraction, contrast check.',
		keywords: ['warna', 'palette', 'shade', 'oklch', 'contrast', 'tailwind', 'hex']
	},
	{
		slug: 'image',
		label: 'Image Compressor',
		description: 'Compress PNG (TinyPNG-style quantization), JPEG, and WebP in the browser.',
		keywords: ['tinypng', 'compress', 'png', 'jpeg', 'webp', 'gambar', 'resize']
	}
];
