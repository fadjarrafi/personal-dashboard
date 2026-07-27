import { json, type RequestHandler } from '@sveltejs/kit';
import { listAllTags } from '$lib/server/items';

export const GET: RequestHandler = async () => {
	return json({ tags: listAllTags() });
};
