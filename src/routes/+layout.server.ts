import { consumeFlash } from '$lib/server/flash';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, cookies }) => {
	return {
		user: locals.user,
		flash: consumeFlash(cookies),
		// Dibaca di server agar lebar sidebar sudah benar saat SSR (tanpa kedipan).
		sidebarCollapsed: cookies.get('sidebar') === 'collapsed'
	};
};
