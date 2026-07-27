import { error, fail, redirect, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { setFlash } from '$lib/server/flash';
import { getReceipt, linkReceiptToSpend } from '$lib/server/receipts';
import { createSpend, listCategories, parseRupiah } from '$lib/server/spends';

interface ExtractedHint {
	hint?: { title?: string | null; text?: string | null; url?: string | null };
	amount?: number | null;
	merchant?: string | null;
	category?: string | null;
	occurredAt?: string | null;
	method?: string | null;
	refId?: string | null;
}

function todayLocalISO(): string {
	const d = new Date();
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, '0');
	const day = String(d.getDate()).padStart(2, '0');
	return `${y}-${m}-${day}`;
}

export const load: PageServerLoad = async ({ locals, params }) => {
	const user = locals.user!;
	const receiptId = Number(params.id);
	if (!Number.isFinite(receiptId)) throw error(404, 'Receipt tidak ditemukan');
	const receipt = getReceipt(user.id, receiptId);
	if (!receipt) throw error(404, 'Receipt tidak ditemukan');

	let extracted: ExtractedHint = {};
	if (receipt.extractedJson) {
		try {
			extracted = JSON.parse(receipt.extractedJson) as ExtractedHint;
		} catch {
			extracted = {};
		}
	}

	const categories = listCategories(user.id);

	return {
		receipt: {
			id: receipt.id,
			mime: receipt.mime,
			createdAt: receipt.createdAt,
			spendId: receipt.spendId
		},
		extracted,
		categories,
		today: todayLocalISO()
	};
};

function parseOccurredAt(raw: string | null): string {
	if (!raw) return new Date().toISOString();
	if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
		return new Date(`${raw}T00:00:00`).toISOString();
	}
	const d = new Date(raw);
	return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

export const actions: Actions = {
	create: async ({ request, locals, params, cookies }) => {
		const user = locals.user!;
		const receiptId = Number(params.id);
		if (!Number.isFinite(receiptId)) throw error(404);
		const receipt = getReceipt(user.id, receiptId);
		if (!receipt) throw error(404);
		if (receipt.spendId) {
			setFlash(cookies, 'info', 'Receipt ini sudah dikaitkan ke pengeluaran.');
			throw redirect(303, `/spends/${receipt.spendId}`);
		}

		const data = await request.formData();
		const amount = parseRupiah(String(data.get('amount') ?? ''));
		if (!Number.isFinite(amount) || amount <= 0) {
			return fail(400, { error: 'Jumlah tidak valid.' });
		}
		const occurredAt = parseOccurredAt(String(data.get('occurred_at') ?? ''));

		const spendId = createSpend(user.id, {
			amount,
			occurredAt,
			category: String(data.get('category') ?? '').trim() || null,
			merchant: String(data.get('merchant') ?? '').trim() || null,
			note: String(data.get('note') ?? '').trim() || null,
			method: String(data.get('method') ?? '').trim() || null,
			refId: String(data.get('ref_id') ?? '').trim() || null
		});

		linkReceiptToSpend(user.id, receiptId, spendId);
		setFlash(cookies, 'success', 'Pengeluaran dari receipt disimpan.');
		throw redirect(303, '/spends');
	}
};
