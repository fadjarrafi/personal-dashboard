import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { readNote } from '$lib/server/vault';

export const load: PageServerLoad = async ({ params }) => {
	const note = readNote(params.path);
	if (!note) throw error(404, 'Note not found in vault mirror.');
	return { note };
};
