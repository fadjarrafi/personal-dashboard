import { fail, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { setFlash } from '$lib/server/flash';
import {
	BILL_CATEGORIES,
	BILL_RECURRENCES,
	createBill,
	listBills,
	type BillCategory,
	type BillRecurrence
} from '$lib/server/bills';
import { parseRupiah } from '$lib/format';
import { listSubscriptions } from '$lib/server/push';

export const load: PageServerLoad = async ({ locals }) => {
	const user = locals.user!;
	return {
		bills: listBills(user.id),
		devices: listSubscriptions(user.id),
		categories: BILL_CATEGORIES,
		recurrences: BILL_RECURRENCES
	};
};

function parseDueDate(raw: string | null): string | null {
	if (!raw || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
	const d = new Date(`${raw}T00:00:00`);
	return isNaN(d.getTime()) ? null : d.toISOString();
}

export const actions: Actions = {
	create: async ({ request, locals, cookies }) => {
		const user = locals.user!;
		const data = await request.formData();

		const title = String(data.get('title') ?? '').trim();
		if (!title) return fail(400, { error: 'Nama tagihan wajib diisi.' });

		const amount = parseRupiah(String(data.get('amount') ?? ''));
		if (!Number.isFinite(amount) || amount <= 0) {
			return fail(400, { error: 'Jumlah tidak valid.' });
		}

		const nextDueAt = parseDueDate(String(data.get('next_due_at') ?? ''));
		if (!nextDueAt) return fail(400, { error: 'Tanggal jatuh tempo tidak valid.' });

		const categoryRaw = String(data.get('category') ?? 'lainnya');
		const category = (BILL_CATEGORIES as readonly string[]).includes(categoryRaw)
			? (categoryRaw as BillCategory)
			: 'lainnya';

		const recurrenceRaw = String(data.get('recurrence') ?? 'monthly');
		const recurrence = (BILL_RECURRENCES as readonly string[]).includes(recurrenceRaw)
			? (recurrenceRaw as BillRecurrence)
			: 'monthly';

		let intervalDays: number | null = null;
		if (recurrence === 'custom_days') {
			intervalDays = Number.parseInt(String(data.get('interval_days') ?? ''), 10);
			if (!Number.isFinite(intervalDays) || intervalDays < 1) {
				return fail(400, { error: 'Interval hari tidak valid.' });
			}
		}

		createBill(user.id, { title, amount, category, recurrence, intervalDays, nextDueAt });
		setFlash(cookies, 'success', 'Tagihan disimpan.');
		return { ok: true };
	}
};
