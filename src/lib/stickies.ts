// Client-safe: palet warna sticky (dipakai UI dan validasi server).
export const STICKY_COLORS = {
	blue: '#c7d9f9',
	yellow: '#fbeaa0',
	green: '#c9ecc8',
	pink: '#f9d0df',
	purple: '#dccdf5',
	orange: '#fad9b8'
} as const;

export type StickyColor = keyof typeof STICKY_COLORS;

export const STICKY_COLOR_NAMES = Object.keys(STICKY_COLORS) as StickyColor[];

export function isStickyColor(v: unknown): v is StickyColor {
	return typeof v === 'string' && v in STICKY_COLORS;
}

/** Teks polos dari HTML sticky — untuk pencarian sisi klien. */
export function stickyPlainText(html: string): string {
	return html
		.replace(/<(br|\/div|\/p)\s*\/?>/gi, '\n')
		.replace(/<[^>]*>/g, '')
		.replace(/&nbsp;/g, ' ')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&amp;/g, '&');
}
