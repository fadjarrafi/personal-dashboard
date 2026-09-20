import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { listDir, searchNotes } from '$lib/server/vault';

export const load: PageServerLoad = async ({ params, url }) => {
	const path = params.path ?? '';
	const query = url.searchParams.get('q')?.trim() ?? '';

	if (query) {
		return { path, query, folders: [], notes: searchNotes(query), mode: 'search' as const };
	}

	const dir = listDir(path);
	if (!dir) throw error(404, 'Folder tidak ditemukan di vault mirror.');
	return { path, query: '', folders: dir.folders, notes: dir.notes, mode: 'browse' as const };
};
