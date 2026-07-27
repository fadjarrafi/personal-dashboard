import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { readReceiptBytes, saveExtracted, saveReceiptFile } from '$lib/server/receipts';
import { extractReceipt } from '$lib/server/receiptExtract';
import { findSpendByRefId } from '$lib/server/spends';
import { setFlash } from '$lib/server/flash';

/**
 * Endpoint yang didaftarkan pada manifest.webmanifest -> share_target.
 * Menerima multipart dari Android share sheet: field `receipt` (image), plus
 * teks opsional `title`/`text`/`url`. Setelah file disimpan, jalankan OCR
 * (tesseract.js, bahasa `ind`) + regex extract → simpan ke `extracted_json`.
 * User diarahkan ke halaman preview /spends/share/[id] untuk konfirmasi.
 *
 * Kalau OCR menemukan `refId` yang cocok dengan spend existing → langsung
 * redirect ke spend tersebut (cegah dupe).
 */

export const load: PageServerLoad = async () => {
	return {};
};

export const actions: Actions = {
	default: async ({ request, locals, cookies }) => {
		const user = locals.user!;
		const data = await request.formData();
		const file = data.get('receipt');
		if (!(file instanceof File)) {
			setFlash(cookies, 'error', 'Share tidak menyertakan gambar receipt.');
			throw redirect(303, '/spends');
		}

		let saved;
		try {
			saved = await saveReceiptFile({ userId: user.id, file });
		} catch (err) {
			const msg = err instanceof Error ? err.message : 'Gagal menyimpan gambar.';
			setFlash(cookies, 'error', msg);
			throw redirect(303, '/spends');
		}

		const hint = {
			title: (data.get('title') as string | null) ?? null,
			text: (data.get('text') as string | null) ?? null,
			url: (data.get('url') as string | null) ?? null
		};

		// Jalankan OCR + extract. Kalau gagal, tetap redirect ke preview dengan hint saja.
		try {
			const bytes = await readReceiptBytes(user.id, saved.id);
			if (bytes) {
				const extracted = await extractReceipt(bytes.bytes);
				saveExtracted(saved.id, user.id, { ...extracted, hint });

				if (extracted.refId) {
					const dupe = findSpendByRefId(user.id, extracted.refId);
					if (dupe) {
						setFlash(
							cookies,
							'info',
							'Receipt ini sudah pernah dicatat sebelumnya.'
						);
						throw redirect(303, `/spends/${dupe.id}`);
					}
				}
			} else if (hint.title || hint.text || hint.url) {
				saveExtracted(saved.id, user.id, { hint });
			}
		} catch (err) {
			// Re-throw redirect (bukan error) agar SvelteKit menangani.
			if (err && typeof err === 'object' && 'status' in err && 'location' in err) throw err;
			console.error('[share] OCR failed:', err);
			if (hint.title || hint.text || hint.url) {
				saveExtracted(saved.id, user.id, { hint });
			}
		}

		throw redirect(303, `/spends/share/${saved.id}`);
	}
};
