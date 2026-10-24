// Utilitas warna client-safe untuk /tools/color: konversi sRGB ↔ OKLab/OKLCH
// (matriks Björn Ottosson), skala shade, harmoni, kontras WCAG, dan k-means.

export type RGB = [number, number, number]; // 0..255
export type OKLCH = { l: number; c: number; h: number }; // l 0..1, c ~0..0.4, h derajat

export function parseHex(input: string): RGB | null {
	let s = input.trim().replace(/^#/, '');
	if (/^[0-9a-f]{3}$/i.test(s)) s = [...s].map((c) => c + c).join('');
	if (!/^[0-9a-f]{6}$/i.test(s)) return null;
	return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16)) as RGB;
}

export function toHex([r, g, b]: RGB): string {
	return '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
}

const toLinear = (v: number) => {
	const c = v / 255;
	return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};
const fromLinear = (v: number) => {
	const x = Math.min(1, Math.max(0, v));
	return 255 * (x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055);
};

function rgbToOklab([r, g, b]: RGB): [number, number, number] {
	const lr = toLinear(r);
	const lg = toLinear(g);
	const lb = toLinear(b);
	const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
	const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
	const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
	return [
		0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
		1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
		0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
	];
}

// Hasil linear-sRGB tanpa clamp, untuk cek gamut.
function oklabToLinear([L, a, b]: [number, number, number]): [number, number, number] {
	const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
	const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
	const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
	return [
		4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
		-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
		-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s
	];
}

export function rgbToOklch(rgb: RGB): OKLCH {
	const [l, a, b] = rgbToOklab(rgb);
	const h = (Math.atan2(b, a) * 180) / Math.PI;
	return { l, c: Math.hypot(a, b), h: (h + 360) % 360 };
}

function lchToLinear({ l, c, h }: OKLCH) {
	const r = (h * Math.PI) / 180;
	return oklabToLinear([l, c * Math.cos(r), c * Math.sin(r)]);
}

const inGamut = (lin: number[]) => lin.every((v) => v >= -1e-4 && v <= 1 + 1e-4);

/** OKLCH → sRGB; chroma diturunkan (binary search) bila di luar gamut sRGB. */
export function oklchToRgb(color: OKLCH): RGB {
	let lin = lchToLinear(color);
	if (!inGamut(lin)) {
		let lo = 0;
		let hi = color.c;
		for (let i = 0; i < 20; i++) {
			const mid = (lo + hi) / 2;
			if (inGamut(lchToLinear({ ...color, c: mid }))) lo = mid;
			else hi = mid;
		}
		lin = lchToLinear({ ...color, c: lo });
	}
	return lin.map((v) => fromLinear(v)) as RGB;
}

export function formatOklch({ l, c, h }: OKLCH): string {
	return `oklch(${(l * 100).toFixed(1)}% ${c.toFixed(3)} ${h.toFixed(1)})`;
}

export const SHADE_STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;
// Faktor chroma per step: rendah di ujung terang/gelap agar tidak "neon" atau keruh.
const CHROMA_FACTOR = [0.15, 0.28, 0.5, 0.72, 0.9, 1, 0.95, 0.85, 0.72, 0.6, 0.45];
const L_MAX = 0.975;
const L_MIN = 0.22;

/** Skala 50–950 dengan warna input tepat di step 500. */
export function shadeScale(base: RGB): Array<{ step: number; rgb: RGB; oklch: OKLCH }> {
	const { l, c, h } = rgbToOklch(base);
	return SHADE_STEPS.map((step, i) => {
		let target: number;
		if (i < 5) target = L_MAX - ((L_MAX - l) * i) / 5;
		else target = l - ((l - L_MIN) * (i - 5)) / 5;
		const oklch = i === 5 ? { l, c, h } : { l: target, c: c * CHROMA_FACTOR[i], h };
		return { step, rgb: i === 5 ? base : oklchToRgb(oklch), oklch };
	});
}

export const HARMONIES: Array<{ name: string; offsets: number[] }> = [
	{ name: 'Complementary', offsets: [0, 180] },
	{ name: 'Analogous', offsets: [-30, 0, 30] },
	{ name: 'Triadic', offsets: [0, 120, 240] },
	{ name: 'Split complementary', offsets: [0, 150, 210] },
	{ name: 'Tetradic', offsets: [0, 90, 180, 270] }
];

export function rotateHue(base: RGB, deg: number): RGB {
	if (deg === 0) return base;
	const c = rgbToOklch(base);
	return oklchToRgb({ ...c, h: (c.h + deg + 360) % 360 });
}

function luminance([r, g, b]: RGB) {
	return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

export function contrastRatio(a: RGB, b: RGB): number {
	const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
	return (hi + 0.05) / (lo + 0.05);
}

/** Teks hitam atau putih yang lebih kontras di atas warna ini. */
export function readableOn(bg: RGB): string {
	return contrastRatio(bg, [0, 0, 0]) >= contrastRatio(bg, [255, 255, 255]) ? '#000000' : '#ffffff';
}

/**
 * Palet dominan dari piksel RGBA (k-means di ruang OKLab agar kluster sesuai persepsi).
 * Inisialisasi farthest-point dari piksel pertama → deterministik untuk gambar yang sama.
 */
export function extractPalette(
	data: Uint8ClampedArray,
	k: number
): Array<{ rgb: RGB; share: number }> {
	const pts: Array<[number, number, number]> = [];
	const src: RGB[] = [];
	for (let i = 0; i < data.length; i += 4) {
		if (data[i + 3] < 128) continue;
		const rgb: RGB = [data[i], data[i + 1], data[i + 2]];
		src.push(rgb);
		pts.push(rgbToOklab(rgb));
	}
	if (pts.length === 0) return [];
	const dist = (a: number[], b: number[]) =>
		(a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;

	const centers: number[][] = [pts[0]];
	const minD = pts.map((p) => dist(p, pts[0]));
	while (centers.length < Math.min(k, pts.length)) {
		let best = 0;
		for (let i = 1; i < pts.length; i++) if (minD[i] > minD[best]) best = i;
		if (minD[best] === 0) break;
		centers.push(pts[best]);
		for (let i = 0; i < pts.length; i++) minD[i] = Math.min(minD[i], dist(pts[i], pts[best]));
	}

	const assign = new Int32Array(pts.length);
	for (let iter = 0; iter < 12; iter++) {
		for (let i = 0; i < pts.length; i++) {
			let bi = 0;
			let bd = Infinity;
			for (let c = 0; c < centers.length; c++) {
				const d = dist(pts[i], centers[c]);
				if (d < bd) [bd, bi] = [d, c];
			}
			assign[i] = bi;
		}
		const sums = centers.map(() => [0, 0, 0, 0]);
		for (let i = 0; i < pts.length; i++) {
			const s = sums[assign[i]];
			s[0] += pts[i][0];
			s[1] += pts[i][1];
			s[2] += pts[i][2];
			s[3]++;
		}
		sums.forEach((s, c) => {
			if (s[3]) centers[c] = [s[0] / s[3], s[1] / s[3], s[2] / s[3]];
		});
	}

	// Rata-rata di ruang RGB asli per kluster untuk warna output.
	const acc = centers.map(() => [0, 0, 0, 0]);
	for (let i = 0; i < src.length; i++) {
		const a = acc[assign[i]];
		a[0] += src[i][0];
		a[1] += src[i][1];
		a[2] += src[i][2];
		a[3]++;
	}
	return acc
		.filter((a) => a[3] > 0)
		.sort((x, y) => y[3] - x[3])
		.map((a) => ({
			rgb: [a[0] / a[3], a[1] / a[3], a[2] / a[3]] as RGB,
			share: a[3] / src.length
		}));
}
