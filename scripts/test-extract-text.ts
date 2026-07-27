/**
 * Uji parser regex extractor pada transkripsi manual (tanpa OCR).
 *
 * Jalankan:
 *   npm run test:extract:text
 *
 * Tujuan: memverifikasi logika parser terpisah dari kualitas OCR.
 * Kalau semua PASS di sini tapi test:extract:image ada yang FAIL, berarti
 * masalahnya di OCR (kualitas teks mentah), bukan regex.
 */
import { extractFromText } from '../src/lib/server/receiptExtract';
import { FIXTURES, type ReceiptFixture } from './fixtures/receipts';

interface FieldResult {
	field: string;
	expected: unknown;
	actual: unknown;
	pass: boolean;
}

function check(fixture: ReceiptFixture): FieldResult[] {
	const result = extractFromText(fixture.transcript);
	const e = fixture.expected;

	const results: FieldResult[] = [];

	results.push({
		field: 'amount',
		expected: e.amount,
		actual: result.amount,
		pass: result.amount === e.amount
	});

	results.push({
		field: 'merchant',
		expected: e.merchant,
		actual: result.merchant,
		pass:
			e.merchant === null
				? result.merchant === null
				: result.merchant !== null && normalizeStr(result.merchant) === normalizeStr(e.merchant)
	});

	const actualDate = result.occurredAt ? result.occurredAt.slice(0, 10) : null;
	results.push({
		field: 'occurredAtDate',
		expected: e.occurredAtDate,
		actual: actualDate,
		pass: actualDate === e.occurredAtDate
	});

	results.push({
		field: 'method',
		expected: e.method,
		actual: result.method,
		pass: result.method === e.method
	});

	if (e.refIdContains !== undefined) {
		results.push({
			field: 'refId',
			expected: `contains "${e.refIdContains}"`,
			actual: result.refId,
			pass: !!result.refId && result.refId.includes(e.refIdContains)
		});
	}

	return results;
}

function normalizeStr(s: string): string {
	return s.toLowerCase().replace(/\s+/g, ' ').trim();
}

const ANSI = {
	green: (s: string) => `\x1b[32m${s}\x1b[0m`,
	red: (s: string) => `\x1b[31m${s}\x1b[0m`,
	yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
	bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
	dim: (s: string) => `\x1b[2m${s}\x1b[0m`
};

let total = 0;
let passed = 0;

for (const fixture of FIXTURES) {
	console.log(`\n${ANSI.bold(fixture.name)}`);
	const results = check(fixture);
	for (const r of results) {
		total++;
		if (r.pass) passed++;
		const badge = r.pass ? ANSI.green('  ✓ PASS') : ANSI.red('  ✗ FAIL');
		const field = r.field.padEnd(16);
		if (r.pass) {
			console.log(`${badge} ${field} ${ANSI.dim(String(r.actual))}`);
		} else {
			console.log(`${badge} ${field}`);
			console.log(`         expected: ${ANSI.dim(JSON.stringify(r.expected))}`);
			console.log(`         actual:   ${ANSI.dim(JSON.stringify(r.actual))}`);
		}
	}
}

console.log(`\n${ANSI.bold('Ringkasan')}: ${passed}/${total} field cocok.`);
if (passed === total) {
	console.log(ANSI.green('Semua parser lulus.'));
	process.exit(0);
} else {
	console.log(ANSI.yellow('Ada field yang gagal — review regex di src/lib/server/receiptExtract.ts'));
	process.exit(1);
}
