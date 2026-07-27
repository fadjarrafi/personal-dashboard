/**
 * Uji end-to-end OCR + parser pada gambar receipt asli.
 *
 * Persiapan:
 *   1. Simpan gambar receipt di scripts/fixtures/receipts/ dengan nama:
 *        - gopay.png (atau .jpg)
 *        - blu.png
 *        - jago.png
 *        - livin.png
 *   2. Jalankan: npm run test:extract:image
 *
 * Panggilan pertama akan mengunduh ind.traineddata (~10 MB) — subsequent runs cepat.
 * File yang tidak ada dilewati.
 */
import { existsSync, readFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { extractReceipt } from '../src/lib/server/receiptExtract';
import { FIXTURES } from './fixtures/receipts';

const FIXTURE_DIR = new URL('./fixtures/receipts/', import.meta.url).pathname.replace(
	/^\/([A-Z]:)/,
	'$1'
);
const EXT_TRY = ['.png', '.jpg', '.jpeg', '.webp'];

function resolveImage(baseName: string): string | null {
	const base = baseName.replace(/\.[^.]+$/, '');
	// 1) Coba nama file persis dulu.
	const direct = join(FIXTURE_DIR, baseName);
	if (existsSync(direct)) return direct;
	// 2) Coba ekstensi umum lain.
	for (const ext of EXT_TRY) {
		const p = join(FIXTURE_DIR, base + ext);
		if (existsSync(p)) return p;
	}
	return null;
}

const ANSI = {
	green: (s: string) => `\x1b[32m${s}\x1b[0m`,
	red: (s: string) => `\x1b[31m${s}\x1b[0m`,
	yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
	bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
	dim: (s: string) => `\x1b[2m${s}\x1b[0m`
};

function normalizeStr(s: string): string {
	return s.toLowerCase().replace(/\s+/g, ' ').trim();
}

let total = 0;
let passed = 0;
let skipped = 0;

console.log(ANSI.dim(`Fixture dir: ${FIXTURE_DIR}`));
console.log(ANSI.dim('OCR pertama menurunkan ind.traineddata (~10 MB), mohon tunggu…\n'));

for (const fixture of FIXTURES) {
	const imagePath = resolveImage(fixture.imageFile);
	if (!imagePath) {
		console.log(`${ANSI.yellow('  ⤾ SKIP')} ${fixture.name} — ${fixture.imageFile} tidak ada`);
		skipped++;
		continue;
	}

	console.log(`\n${ANSI.bold(fixture.name)}  ${ANSI.dim(`(${imagePath.split(/[/\\]/).pop()})`)}`);
	const t0 = Date.now();
	const bytes = readFileSync(imagePath);
	let result;
	try {
		result = await extractReceipt(bytes);
	} catch (err) {
		console.log(ANSI.red(`  ✗ OCR gagal: ${err instanceof Error ? err.message : err}`));
		continue;
	}
	const dt = Date.now() - t0;
	console.log(ANSI.dim(`  OCR + extract: ${dt} ms`));

	const e = fixture.expected;

	const checks: Array<{ field: string; pass: boolean; expected: unknown; actual: unknown }> = [
		{ field: 'amount', pass: result.amount === e.amount, expected: e.amount, actual: result.amount },
		{
			field: 'merchant',
			pass:
				e.merchant === null
					? result.merchant === null
					: !!result.merchant && normalizeStr(result.merchant).includes(normalizeStr(e.merchant)),
			expected: e.merchant,
			actual: result.merchant
		},
		{
			field: 'date',
			pass: result.occurredAt ? result.occurredAt.slice(0, 10) === e.occurredAtDate : false,
			expected: e.occurredAtDate,
			actual: result.occurredAt?.slice(0, 10) ?? null
		},
		{ field: 'method', pass: result.method === e.method, expected: e.method, actual: result.method }
	];

	if (e.refIdContains !== undefined) {
		checks.push({
			field: 'refId',
			pass: !!result.refId && result.refId.toLowerCase().includes(e.refIdContains.toLowerCase()),
			expected: `contains "${e.refIdContains}"`,
			actual: result.refId
		});
	}

	for (const c of checks) {
		total++;
		if (c.pass) passed++;
		const badge = c.pass ? ANSI.green('  ✓') : ANSI.red('  ✗');
		if (c.pass) {
			console.log(`${badge} ${c.field.padEnd(10)} ${ANSI.dim(String(c.actual))}`);
		} else {
			console.log(`${badge} ${c.field.padEnd(10)} expected ${JSON.stringify(c.expected)}, got ${JSON.stringify(c.actual)}`);
		}
	}
}

console.log(`\n${ANSI.bold('Ringkasan')}: ${passed}/${total} field cocok (${skipped} fixture dilewati).`);
process.exit(passed === total ? 0 : 1);
