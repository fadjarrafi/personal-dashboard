import { consumeFlash } from '$lib/server/flash';
import { SIDEBAR_COOKIE_NAME } from '$lib/components/ui/sidebar/constants';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, cookies }) => {
	return {
		user: locals.user,
		flash: consumeFlash(cookies),
		// Dibaca di server agar lebar sidebar sudah benar saat SSR (tanpa kedipan).
		// Cookie ditulis oleh Sidebar.Provider (shadcn-svelte) sendiri.
		sidebarOpen: cookies.get(SIDEBAR_COOKIE_NAME) !== 'false'
	};
};
