export function todayLocalISODate(now: Date = new Date()): string {
	const y = now.getFullYear();
	const m = String(now.getMonth() + 1).padStart(2, '0');
	const d = String(now.getDate()).padStart(2, '0');
	return `${y}-${m}-${d}`;
}

export function diffInDays(dateIso: string, today: string): number {
	const a = new Date(`${dateIso.slice(0, 10)}T00:00:00`);
	const b = new Date(`${today}T00:00:00`);
	return Math.round((a.getTime() - b.getTime()) / 86_400_000);
}
