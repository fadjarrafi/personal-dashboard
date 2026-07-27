/**
 * Data uji untuk parser receipt.
 *
 * `transcript` = hasil transkripsi manual dari gambar (sebagai kalau OCR sempurna).
 * `expected`   = nilai yang diharapkan dari extractor.
 * `imageFile`  = nama file gambar di scripts/fixtures/receipts/ (untuk uji OCR).
 */

export interface ReceiptFixture {
	name: string;
	imageFile: string;
	transcript: string;
	expected: {
		amount: number | null;
		merchant: string | null;
		occurredAtDate: string | null; // "YYYY-MM-DD" saja, jam boleh beda
		method: string | null;
		refIdContains?: string;
	};
}

export const FIXTURES: ReceiptFixture[] = [
	{
		name: 'GoPay - QR KANTIN BU ROSI',
		imageFile: 'gopay.png',
		transcript: `gopay
Rp15.000
QR KANTIN BU ROSI
Jalan Banteng Utama, No. 43, Sinduharjo, Ngaglik, Sle...

Rincian transaksi

Status                        Selesai
Metode pembayaran             GoPay Saldo
Waktu                         12:54
Tanggal                       17 Jul 2026
ID transaksi                  05202607170554104Xa...

Acquirer Name                 BRI
Merchant Name                 QR KANTIN BU ROSI
Merchant Location             BANTUL
Merchant PAN                  9360000200415543243
Terminal ID                   A01
QRIS RRN                      001337400517
Customer PAN                  9360091430280540418

Jumlah                        Rp15.000

Total                         Rp15.000`,
		expected: {
			amount: 15000,
			merchant: 'QR KANTIN BU ROSI',
			occurredAtDate: '2026-07-17',
			method: 'gopay',
			refIdContains: '05202607170554104'
		}
	},
	{
		name: 'blu BCA - TAHU BULAT SURYA LESTARI',
		imageFile: 'blu.png',
		transcript: `blu
BCAdigital
Transaksi Berhasil

Total
Rp 10.500,00

Fadjar Irfan Rafi
bluAccount

TAHU BULAT SURYA LESTARI
BANTUL

Nominal Tagihan               Rp 10.500,00

Tgl & Jam Transaksi           09 Jul 2026 17:00:04 WIB

Tipe Transaksi                QRIS

No. Ref blu                   1q7c nor3 2062

blu adalah aplikasi mobile banking dari BCA Digital.
blubybcadigital.id`,
		expected: {
			amount: 10500,
			merchant: 'TAHU BULAT SURYA LESTARI',
			occurredAtDate: '2026-07-09',
			method: 'blu',
			refIdContains: '1q7cnor32062'
		}
	},
	{
		name: 'Jago - transfer (no merchant)',
		imageFile: 'jago.png',
		transcript: `Jago

FADJAR IRFAN RAFI
BCA Digital • 009007279286

Rp70.000

Transaction ID
260619JAGBIDJA00150235

Account Source
FADJAR IRFAN RAFI
Jago 109635408929

Transaction date & time
19 Jun 2026, 14:45 WIB

This receipt is legitimate proof of transaction
Have a question?
Ask Tanya Jago 24/7`,
		expected: {
			amount: 70000,
			merchant: null, // transfer receipt tidak punya merchant
			occurredAtDate: '2026-06-19',
			method: 'jago',
			refIdContains: '260619JAGBIDJA00150235'
		}
	},
	{
		name: "Livin' Mandiri - CIRENG CANDU",
		imageFile: 'livin.png',
		transcript: `livin
by mandiri

QR Bayar
Pembayaran Berhasil!
25 Jul 2026 • 19:11:26 WIB • No. Ref. 2607251122577262313

Penerima
CIRENG CANDU
SLEMAN, ID

Detail Transaksi
Total Transaksi               Rp 16.000

Sumber Dana
FADJAR IRFAN RAFI
Bank Mandiri - .........1143

No. Referensi QRIS            607658014196
Pengakuisisi                  Bank BCA
Merchant PAN                  9360001400030053573
Customer PAN                  9360000812266911434
Terminal ID                   A01`,
		expected: {
			amount: 16000,
			merchant: 'CIRENG CANDU',
			occurredAtDate: '2026-07-25',
			method: 'livin',
			refIdContains: '607658014196'
		}
	}
];
