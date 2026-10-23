import { error, json, type RequestHandler } from '@sveltejs/kit';
import { listFolder } from '$lib/server/vault';

export const GET: RequestHandler = async ({ url }) => {
	const folder = url.searchParams.get('folder');
	if (!folder) throw error(400, 'Query param "folder" is required.');
	try {
		return json({ notes: listFolder(folder) });
	} catch {
		throw error(400, 'Invalid folder.');
	}
};
