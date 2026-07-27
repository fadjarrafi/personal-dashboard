import type { RequestHandler } from '@sveltejs/kit';
import { raw } from '$lib/server/db';

export const GET: RequestHandler = async ({ locals }) => {
	const userId = locals.user!.id;

	const items = raw
		.prepare(
			`SELECT id, type, title, body, url, language, pinned,
			        created_at AS createdAt, updated_at AS updatedAt, archived_at AS archivedAt
			 FROM items WHERE user_id = ? ORDER BY id`
		)
		.all(userId);

	const tags = raw
		.prepare(
			`SELECT it.item_id AS itemId, t.name
			 FROM item_tags it JOIN tags t ON t.id = it.tag_id
			 WHERE it.item_id IN (SELECT id FROM items WHERE user_id = ?)`
		)
		.all(userId);

	const payload = {
		exportedAt: new Date().toISOString(),
		version: 1,
		items,
		tags
	};

	const filename = `dashboard-export-${new Date().toISOString().slice(0, 10)}.json`;
	return new Response(JSON.stringify(payload, null, 2), {
		headers: {
			'content-type': 'application/json; charset=utf-8',
			'content-disposition': `attachment; filename="${filename}"`
		}
	});
};
