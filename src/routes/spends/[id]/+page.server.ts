import { error, fail, redirect, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { setFlash } from '$lib/server/flash';
import {
	deleteSpend,
	getSpend,
	listCategories,
	parseRupiah,
	updateSpend
} from '$lib/server/spends';

export const load: PageServerLoad = async ({ locals, params }) => {
	const user = locals.user!;
	const id = Number(params.id);
	if (!Number.isFinite(id)) throw error(404, 'Tidak ditemukan');
	const spend = getSpend(user.id, id);
	if (!spend) throw error(404, 'Tidak ditemukan');
	const categories = listCategories(user.id);
	return { spend, categories };
};

function parseOccurredAt(raw: string | null): string | null {
	if (!raw) return null;
	if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
		return new Date(`${raw}T00:00:00`).toISOString();
	}
	const d = new Date(raw);
	return isNaN(d.getTime()) ? null : d.toISOString();
}

export const actions: Actions = {
	update: async ({ request, locals, params, cookies }) => {
		const user = locals.user!;
		const id = Number(params.id);
		if (!Number.isFinite(id)) throw error(404);
		const data = await request.formData();

		const amount = parseRupiah(String(data.get('amount') ?? ''));
		if (!Number.isFinite(amount) || amount <= 0) {
			return fail(400, { error: 'Jumlah tidak valid.' });
		}
		const occurredAt = parseOccurredAt(String(data.get('occurred_at') ?? ''));
		if (!occurredAt) return fail(400, { error: 'Tanggal tidak valid.' });

		updateSpend(user.id, id, {
			amount,
			occurredAt,
			category: String(data.get('category') ?? '').trim() || null,
			merchant: String(data.get('merchant') ?? '').trim() || null,
			note: String(data.get('note') ?? '').trim() || null,
			method: String(data.get('method') ?? '').trim() || null
		});
		setFlash(cookies, 'success', 'Pengeluaran diperbarui.');
		throw redirect(303, '/spends');
	},

	delete: async ({ locals, params, cookies }) => {
		const user = locals.user!;
		const id = Number(params.id);
		if (!Number.isFinite(id)) throw error(404);
		deleteSpend(user.id, id);
		setFlash(cookies, 'success', 'Pengeluaran dihapus.');
		throw redirect(303, '/spends');
	}
};
