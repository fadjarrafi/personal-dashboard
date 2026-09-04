/**
 * Kirim reminder push untuk tagihan yang jatuh tempo/segera jatuh tempo.
 * Maksimal 2 notifikasi per siklus per tagihan: sekali saat memasuki awal
 * jendela reminder, sekali lagi tepat di hari-H (docs/PRD-bill-reminder.md §4.4).
 *
 * Jalankan: npm run bills:remind
 * Cron: sekali sehari, mis. jam 08:00 - lihat README bagian "Bill reminder".
 */
import {
	deriveStatus,
	listActiveBillsForReminders,
	markNotified,
	REMINDER_DAYS_BEFORE
} from '../src/lib/server/bills';
import { sendToUser } from '../src/lib/server/push';
import { formatRupiah } from '../src/lib/format';

function humanDueLabel(daysUntilDue: number): string {
	if (daysUntilDue < 0) return `telat ${Math.abs(daysUntilDue)} hari`;
	if (daysUntilDue === 0) return 'jatuh tempo hari ini';
	return `jatuh tempo ${daysUntilDue} hari lagi`;
}

async function main() {
	const bills = listActiveBillsForReminders();
	let sent = 0;

	for (const bill of bills) {
		if (bill.snoozedUntil && new Date(bill.snoozedUntil).getTime() > Date.now()) {
			continue;
		}

		const { daysUntilDue } = deriveStatus(bill);
		const payload = {
			title: bill.title,
			body: `${formatRupiah(bill.amount)} · ${humanDueLabel(daysUntilDue)}`,
			url: `/bills/${bill.id}`,
			billId: bill.id
		};

		if (daysUntilDue <= 0) {
			if (bill.dueDayNotifiedAt === bill.nextDueAt) continue;
			await sendToUser(bill.userId, payload);
			markNotified(bill.userId, bill.id, 'due_day', bill.nextDueAt);
			sent++;
			continue;
		}

		if (daysUntilDue <= REMINDER_DAYS_BEFORE) {
			if (bill.windowNotifiedAt === bill.nextDueAt) continue;
			await sendToUser(bill.userId, payload);
			markNotified(bill.userId, bill.id, 'window', bill.nextDueAt);
			sent++;
		}
	}

	console.log(`bill reminders: ${sent} terkirim dari ${bills.length} tagihan aktif`);
}

await main();
