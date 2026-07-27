import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { readReceiptBytes } from '$lib/server/receipts';

export const GET: RequestHandler = async ({ locals, params }) => {
	const user = locals.user;
	if (!user) throw error(401, 'Unauthorized');

	const id = Number(params.id);
	if (!Number.isFinite(id)) throw error(404);

	const receipt = await readReceiptBytes(user.id, id);
	if (!receipt) throw error(404);

	const blob = new Blob([new Uint8Array(receipt.bytes)], { type: receipt.mime });
	return new Response(blob, {
		headers: {
			'content-type': receipt.mime,
			'cache-control': 'private, max-age=3600'
		}
	});
};
