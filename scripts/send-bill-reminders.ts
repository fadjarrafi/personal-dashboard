/**
 * Kirim reminder push untuk tagihan yang jatuh tempo/segera jatuh tempo.
 * Maksimal 2 notifikasi per siklus per tagihan: sekali saat memasuki awal
 * jendela reminder, sekali lagi tepat di hari-H (docs/PRD-bill-reminder.md §4.4).
 *
 * Jalankan: bun run bills:remind
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
	if (daysUntilDue < 0) return `${Math.abs(daysUntilDue)} day(s) overdue`;
	if (daysUntilDue === 0) return 'due today';
	return `due in ${daysUntilDue} day(s)`;
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
			// Hanya tandai bila minimal satu device menerima - kalau tidak, run
			// cron berikutnya mencoba lagi alih-alih reminder hilang diam-diam.
			if ((await sendToUser(bill.userId, payload)) === 0) continue;
			markNotified(bill.userId, bill.id, 'due_day', bill.nextDueAt);
			sent++;
			continue;
		}

		if (daysUntilDue <= REMINDER_DAYS_BEFORE) {
			if (bill.windowNotifiedAt === bill.nextDueAt) continue;
			if ((await sendToUser(bill.userId, payload)) === 0) continue;
			markNotified(bill.userId, bill.id, 'window', bill.nextDueAt);
			sent++;
		}
	}

	console.log(`bill reminders: ${sent} terkirim dari ${bills.length} tagihan aktif`);
}

await main();
