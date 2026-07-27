/**
 * Format integer rupiah → "Rp 15.000". Client-safe (dipakai di komponen).
 */
export function formatRupiah(amount: number): string {
	const n = Math.round(amount);
	return 'Rp ' + n.toLocaleString('id-ID');
}

/**
 * Parse "Rp 15.000" / "15000" / "15,000.50" → integer rupiah, atau NaN kalau gagal.
 */
export function parseRupiah(input: string): number {
	if (!input) return NaN;
	const cleaned = input
		.replace(/\s/g, '')
		.replace(/^Rp\.?/i, '')
		.replace(/[,.](\d{1,2})$/, '')
		.replace(/[.,]/g, '');
	const n = Number.parseInt(cleaned, 10);
	return Number.isFinite(n) ? n : NaN;
}
