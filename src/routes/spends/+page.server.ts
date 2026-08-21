import { fail, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { setFlash } from '$lib/server/flash';
import {
	createSpend,
	currentMonthRange,
	getDailyTotals,
	getMonthlyTotals,
	getSummary,
	listCategories,
	listSpends,
	parseRupiah
} from '$lib/server/spends';

function parsePeriod(url: URL): { from: string; to: string; prevFrom: string; prevTo: string; label: string } {
	const monthParam = url.searchParams.get('month'); // format YYYY-MM
	if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
		const [y, m] = monthParam.split('-').map(Number);
		const from = new Date(y, m - 1, 1).toISOString();
		const to = new Date(y, m, 1).toISOString();
		const prevFrom = new Date(y, m - 2, 1).toISOString();
		const prevTo = from;
		return { from, to, prevFrom, prevTo, label: monthParam };
	}
	const now = new Date();
	const r = currentMonthRange(now);
	const label = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
	return { ...r, label };
}

export const load: PageServerLoad = async ({ locals, url }) => {
	const user = locals.user!;
	const period = parsePeriod(url);
	const category = url.searchParams.get('category') ?? undefined;
	const q = url.searchParams.get('q') ?? undefined;

	const spends = listSpends({
		userId: user.id,
		from: period.from,
		to: period.to,
		category,
		q
	});
	const summary = getSummary(user.id, period.from, period.to, period.prevFrom, period.prevTo);
	const daily = getDailyTotals(user.id, period.from, period.to);
	const [anchorYear, anchorMonth] = period.label.split('-').map(Number);
	const monthly = getMonthlyTotals(user.id, 6, new Date(anchorYear, anchorMonth - 1, 1));
	const categories = listCategories(user.id);

	return {
		spends,
		summary,
		daily,
		monthly,
		categories,
		today: todayLocalISO(),
		filters: {
			month: period.label,
			category: category ?? null,
			q: q ?? null
		}
	};
};

function todayLocalISO(): string {
	const d = new Date();
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, '0');
	const day = String(d.getDate()).padStart(2, '0');
	return `${y}-${m}-${day}`;
}

function parseOccurredAt(raw: string | null): string {
	if (!raw) return new Date().toISOString();
	// Terima "YYYY-MM-DD" (dari <input type="date">) atau ISO penuh.
	if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
		return new Date(`${raw}T00:00:00`).toISOString();
	}
	const d = new Date(raw);
	return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

export const actions: Actions = {
	create: async ({ request, locals, cookies }) => {
		const user = locals.user!;
		const data = await request.formData();
		const amountRaw = String(data.get('amount') ?? '');
		const amount = parseRupiah(amountRaw);
		if (!Number.isFinite(amount) || amount <= 0) {
			return fail(400, { error: 'Jumlah tidak valid.', values: Object.fromEntries(data) });
		}

		const occurredAt = parseOccurredAt(String(data.get('occurred_at') ?? ''));
		const category = String(data.get('category') ?? '').trim() || null;
		const merchant = String(data.get('merchant') ?? '').trim() || null;
		const note = String(data.get('note') ?? '').trim() || null;
		const method = String(data.get('method') ?? '').trim() || null;

		createSpend(user.id, {
			amount,
			occurredAt,
			category,
			merchant,
			note,
			method
		});
		setFlash(cookies, 'success', 'Pengeluaran disimpan.');
		return { ok: true };
	}
};

