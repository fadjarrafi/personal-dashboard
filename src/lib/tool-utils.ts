// Helper kecil yang dipakai bersama oleh halaman /tools/*. Client-safe, tanpa dependensi.

export function bytesToBase64(bytes: Uint8Array): string {
	let bin = '';
	for (let i = 0; i < bytes.length; i += 0x8000) {
		bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
	}
	return btoa(bin);
}

/** Terima Base64 standar maupun Base64URL, dengan/tanpa padding dan whitespace. */
export function base64ToBytes(b64: string): Uint8Array {
	let s = b64.replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/');
	s += '='.repeat((4 - (s.length % 4)) % 4);
	const bin = atob(s);
	return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

export function toBase64Url(b64: string): string {
	return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function bytesToHex(bytes: Uint8Array): string {
	return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function fmtSize(n: number): string {
	if (n < 1024) return `${n} B`;
	if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`;
	return `${(n / 1024 ** 2).toFixed(2)} MB`;
}

export function downloadBlob(blob: Blob, name: string): void {
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = name;
	a.click();
	setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function errorMessage(e: unknown): string {
	return e instanceof Error ? e.message : String(e);
}

/** Integer acak tak bias di [0, max) dari crypto.getRandomValues (rejection sampling). */
export function randomInt(max: number): number {
	if (max <= 0) return 0;
	const limit = Math.floor(0x1_0000_0000 / max) * max;
	const buf = new Uint32Array(1);
	for (;;) {
		crypto.getRandomValues(buf);
		if (buf[0] < limit) return buf[0] % max;
	}
}

export function randomFrom(charset: string, length: number): string {
	const chars = Array.from(charset);
	let out = '';
	for (let i = 0; i < length; i++) out += chars[randomInt(chars.length)];
	return out;
}

/** Pecah kata dari string apa pun (camelCase, snake_case, kebab, spasi, akronim). */
export function splitWords(s: string): string[] {
	return (
		s
			.replace(/([a-z\d])([A-Z])/g, '$1 $2')
			.replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
			.match(/[\p{L}\d]+/gu) ?? []
	);
}

/** CSS dasar untuk konten yang dirender di SandboxFrame (mengikuti color-scheme sistem). */
export const PREVIEW_CSS = `
	:root { color-scheme: light dark; }
	body { font: 14px/1.6 system-ui, sans-serif; margin: 12px; overflow-wrap: anywhere; }
	pre, code { font-family: ui-monospace, monospace; font-size: 12px; }
	pre { padding: 8px; overflow: auto; background: color-mix(in srgb, currentColor 7%, transparent); border-radius: 6px; }
	table { border-collapse: collapse; } th, td { border: 1px solid color-mix(in srgb, currentColor 25%, transparent); padding: 4px 8px; }
	img { max-width: 100%; } blockquote { margin-left: 0; padding-left: 12px; border-left: 3px solid color-mix(in srgb, currentColor 25%, transparent); }
`;
