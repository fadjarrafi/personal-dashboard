import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter(),
		alias: {
			$lib: 'src/lib'
		},
		csrf: {
			// Matikan check bawaan agar Android Web Share Target (POST multipart
			// dari system share sheet ke /spends/share) tidak diblok. Origin
			// header dari share intent tidak selalu match app origin.
			// Perlindungan CSRF diterapkan ulang secara manual di hooks.server.ts
			// untuk semua POST/PUT/PATCH/DELETE kecuali endpoint share_target.
			checkOrigin: false
		}
	}
};

export default config;
