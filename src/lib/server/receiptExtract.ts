/**
 * OCR + parser regex untuk receipt e-wallet/e-banking Indonesia.
 *
 * Alur: Buffer gambar -> Tesseract.js (bahasa `ind`) -> text mentah -> parser
 * regex generik (bukan per-issuer). Semua field opsional; kalau tidak ketemu
 * dikembalikan null dan user melengkapi di form preview.
 */

export interface ExtractedReceipt {
	amount: number | null;
	merchant: string | null;
	occurredAt: string | null; // ISO string
	method: string | null;
	refId: string | null;
	rawText: string;
}

/**
 * Worker Tesseract di-cache di module scope agar init WASM + traineddata (~10 MB)
 * cuma sekali per proses. Aman untuk single-user; hindari race dengan mutex sederhana.
 */
let workerPromise: Promise<import('tesseract.js').Worker> | null = null;
let workerBusy: Promise<unknown> = Promise.resolve();

async function getWorker(): Promise<import('tesseract.js').Worker> {
	if (!workerPromise) {
		workerPromise = (async () => {
			const { createWorker } = await import('tesseract.js');
			// createWorker menerima bahasa langsung + auto-download traineddata.
			return createWorker('ind');
		})();
	}
	return workerPromise;
}

export async function runOcr(bytes: Buffer): Promise<string> {
	const worker = await getWorker();
	// Serialize recognize() call — Tesseract worker tidak paralel-aman.
	const prev = workerBusy;
	let release!: () => void;
	workerBusy = new Promise<void>((r) => (release = r));
	try {
		await prev;
		const { data } = await worker.recognize(bytes);
		return data.text ?? '';
	} finally {
		release();
	}
}

const MONTH_MAP: Record<string, number> = {
	jan: 0, januari: 0,
	feb: 1, februari: 1,
	mar: 2, maret: 2,
	apr: 3, april: 3,
	mei: 4,
	jun: 5, juni: 5,
	jul: 6, juli: 6,
	agu: 7, ags: 7, agustus: 7,
	sep: 8, sept: 8, september: 8,
	okt: 9, oct: 9, oktober: 9,
	nov: 10, november: 10,
	des: 11, dec: 11, desember: 11
};

function extractAmount(text: string): number | null {
	const re = /Rp\s?\.?\s?([\d.]+(?:,\d{1,2})?)/gi;
	const matches: Array<{ num: number; contextBefore: string }> = [];
	let m: RegExpExecArray | null;
	while ((m = re.exec(text)) !== null) {
		const raw = m[1];
		const clean = raw.replace(/[,.]\d{1,2}$/, '').replace(/[.,]/g, '');
		const num = Number.parseInt(clean, 10);
		if (!Number.isFinite(num) || num <= 0) continue;
		const before = text.slice(Math.max(0, m.index - 40), m.index).toLowerCase();
		matches.push({ num, contextBefore: before });
	}
	if (matches.length === 0) return null;
	// Prioritaskan yang setelah "total"/"jumlah"/"nominal"/"tagihan"/"pembayaran".
	const preferred = matches.find((mm) =>
		/(total|jumlah|nominal|tagihan|pembayaran)/i.test(mm.contextBefore)
	);
	if (preferred) return preferred.num;
	// Fallback: nilai terbesar (biasanya total).
	return matches.reduce((a, b) => (b.num > a.num ? b : a)).num;
}

function extractDate(text: string): string | null {
	// Format Indonesia: "17 Jul 2026" / "17 Juli 2026" / "25 Jul 2026 • 19:11:26 WIB".
	const re = /(\d{1,2})\s+([A-Za-z]{3,10})\s+(\d{4})(?:[,\s]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/;
	const m = text.match(re);
	if (!m) return null;
	const day = Number.parseInt(m[1], 10);
	const monthName = m[2].toLowerCase();
	const month = MONTH_MAP[monthName] ?? MONTH_MAP[monthName.slice(0, 3)];
	if (month === undefined) return null;
	const year = Number.parseInt(m[3], 10);
	const hh = m[4] ? Number.parseInt(m[4], 10) : 0;
	const mm = m[5] ? Number.parseInt(m[5], 10) : 0;
	const ss = m[6] ? Number.parseInt(m[6], 10) : 0;
	// Pakai Date.UTC agar `.toISOString().slice(0, 10)` selalu mengembalikan
	// tanggal yang sama seperti yang tertulis di receipt (independen dari
	// timezone server). Receipt tidak selalu punya info TZ eksplisit; asumsikan
	// tanggal yang tertulis adalah tanggal yang benar.
	const ms = Date.UTC(year, month, day, hh, mm, ss);
	return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
}

const LOCATION_MARKER =
	/^(BANTUL|SLEMAN|JAKARTA|BANDUNG|SURABAYA|YOGYAKARTA|SEMARANG|MEDAN|MALANG|DENPASAR|KOTA\s|KAB\.?\s|ID$)/i;

function extractMerchant(text: string): string | null {
	// Kalau receipt jelas transfer/pengiriman (bukan pembayaran merchant), tidak
	// ada merchant → kembalikan null. Sinyal transfer yang kuat: label "Account
	// Source"/"Sumber Dana" dominan tanpa marker penerima merchant.
	const isTransferReceipt =
		/Account\s*Source/i.test(text) && !/Penerima|Merchant/i.test(text);
	if (isTransferReceipt) return null;

	// 1) Label eksplisit.
	const labels: RegExp[] = [
		/Merchant\s*Name\s*[:\-]?\s*(.+)/i,
		/Penerima\s*[:\-]?\s*\n?([^\n]+)/i,
		/\bTo\b\s*[:\-]?\s*([^\n]+)/i,
		/\bKE\b\s*[:\-]?\s*([^\n]+)/i,
		/Nama\s*Merchant\s*[:\-]?\s*(.+)/i
	];
	for (const pat of labels) {
		const m = text.match(pat);
		if (!m || !m[1]) continue;
		const val = m[1].trim().split('\n')[0].trim();
		if (val.length > 0 && val.length < 100 && !/^Rp/i.test(val)) return val;
	}
	// 2) Baris tepat sebelum marker lokasi.
	const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
	for (let i = 1; i < lines.length; i++) {
		if (LOCATION_MARKER.test(lines[i])) {
			const candidate = lines[i - 1];
			if (
				candidate &&
				candidate.length < 100 &&
				!/Rp\s*[\d]/i.test(candidate) &&
				!/^\d/.test(candidate)
			) {
				return candidate;
			}
		}
	}
	// Tidak ada fallback uppercase-heavy — terlalu rawan salah tebak nama
	// pengirim/pemilik akun sebagai merchant. Lebih aman kembali null dan biarkan
	// user isi manual.
	return null;
}

// Urutan penting: metode yang lebih spesifik (nama app) diperiksa lebih dulu.
// Contoh: Jago menampilkan "BCA Digital" sebagai info akun sumber — kalau kita
// cek "blu" (yang juga match "BCA Digital") lebih dulu, method akan salah.
const METHOD_PATTERNS: Array<[RegExp, string]> = [
	[/gopay/i, 'gopay'],
	[/\bjago\b/i, 'jago'],
	[/livin/i, 'livin'],
	[/\bblu\b|BCAdigital/i, 'blu'],
	[/\bdana\b/i, 'dana'],
	[/\bovo\b/i, 'ovo'],
	[/shopeepay/i, 'shopeepay'],
	[/BRImo|\bBRI\b/i, 'bri'],
	[/wondr|\bBNI\b/i, 'bni'],
	[/mandiri/i, 'mandiri'],
	[/qris/i, 'qris']
];

function extractMethod(text: string): string | null {
	for (const [re, name] of METHOD_PATTERNS) {
		if (re.test(text)) return name;
	}
	return null;
}

function extractRefId(text: string): string | null {
	// Perhatikan: kelompok tangkap tidak boleh menyeberang newline agar tidak
	// ikut menyerap teks paragraf setelah nomor referensi. Pola blu ("No. Ref
	// blu 1q7c nor3 2062") ada spasi antar segmen, jadi izinkan spasi horizontal
	// tapi bukan newline.
	const patterns = [
		/ID\s*transaksi\s*[:\-]?\s*([A-Za-z0-9]{6,})/i,
		/Transaction\s*ID[^\n]*?\n?\s*([A-Za-z0-9]{6,})/i,
		/No\.?\s*Ref[a-z]*(?:\s*(?:blu|QRIS))?\s*[:\-]?\s*([A-Za-z0-9][A-Za-z0-9 ]{3,})/i,
		/Nomor\s*Referensi\s*[:\-]?\s*([A-Za-z0-9]{6,})/i,
		/QRIS\s*RRN\s*[:\-]?\s*(\d{6,})/i,
		/No\.?\s*Referensi\s*QRIS\s*[:\-]?\s*(\d{6,})/i
	];
	for (const pat of patterns) {
		const m = text.match(pat);
		if (!m || !m[1]) continue;
		// Ambil hanya potongan pada baris yang sama, buang spasi, batasi 40 char.
		const val = m[1].split(/\n/)[0].trim().replace(/\s+/g, '').slice(0, 40);
		if (val.length >= 4) return val;
	}
	return null;
}

export function extractFromText(text: string): Omit<ExtractedReceipt, 'rawText'> {
	return {
		amount: extractAmount(text),
		merchant: extractMerchant(text),
		occurredAt: extractDate(text),
		method: extractMethod(text),
		refId: extractRefId(text)
	};
}

export async function extractReceipt(bytes: Buffer): Promise<ExtractedReceipt> {
	const rawText = await runOcr(bytes);
	return { ...extractFromText(rawText), rawText };
}
