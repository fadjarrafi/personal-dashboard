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
		description: 'Format, minify, validasi, dan urutkan key JSON.',
		keywords: ['format', 'prettify', 'minify', 'validate', 'beautify']
	},
	{
		slug: 'encode',
		label: 'Encode / Decode',
		description: 'Base64 (UTF-8), URL encoding, dan HTML entities.',
		keywords: ['base64', 'url', 'uri', 'html', 'entity', 'escape']
	},
	{
		slug: 'jwt',
		label: 'JWT Decoder',
		description: 'Lihat header & payload JWT beserta status kedaluwarsa.',
		keywords: ['token', 'jwt', 'decode', 'bearer', 'exp']
	},
	{
		slug: 'uuid',
		label: 'UUID',
		description: 'Generate UUID v4 dan v7 (urut waktu), sekaligus banyak.',
		keywords: ['guid', 'id', 'random', 'v4', 'v7']
	},
	{
		slug: 'time',
		label: 'Epoch / Tanggal',
		description: 'Konversi Unix timestamp (detik/ms) ↔ ISO & waktu lokal.',
		keywords: ['timestamp', 'unix', 'epoch', 'date', 'iso', 'waktu']
	},
	{
		slug: 'regex',
		label: 'Regex Tester',
		description: 'Uji pola regex dengan highlight match dan capture group.',
		keywords: ['regexp', 'pattern', 'match', 'group']
	},
	{
		slug: 'hash',
		label: 'Hash',
		description: 'MD5, SHA-1, SHA-256/384/512 untuk teks atau file.',
		keywords: ['md5', 'sha', 'sha256', 'checksum', 'digest']
	},
	{
		slug: 'color',
		label: 'Color Palette',
		description: 'Skala shade oklch, harmoni warna, ekstrak palet gambar, cek kontras.',
		keywords: ['warna', 'palette', 'shade', 'oklch', 'contrast', 'tailwind', 'hex']
	},
	{
		slug: 'image',
		label: 'Image Compressor',
		description: 'Kompres PNG (kuantisasi ala TinyPNG), JPEG, dan WebP di browser.',
		keywords: ['tinypng', 'compress', 'png', 'jpeg', 'webp', 'gambar', 'resize']
	}
];
