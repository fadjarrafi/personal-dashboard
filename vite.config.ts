import { sveltekit } from '@sveltejs/kit/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		sveltekit(),
		SvelteKitPWA({
			registerType: 'autoUpdate',
			manifest: {
				name: 'Personal Dashboard',
				short_name: 'Dashboard',
				description: 'Bookmarks, notes, and snippets — capture fast, find fast.',
				theme_color: '#0f172a',
				background_color: '#0f172a',
				display: 'standalone',
				start_url: '/',
				scope: '/',
				icons: [
					{ src: '/icons/icon.svg', sizes: 'any', type: 'image/svg+xml' },
					{
						src: '/icons/maskable.svg',
						sizes: 'any',
						type: 'image/svg+xml',
						purpose: 'maskable'
					}
				],
				share_target: {
					action: '/spends/share',
					method: 'POST',
					enctype: 'multipart/form-data',
					params: {
						title: 'title',
						text: 'text',
						url: 'url',
						files: [{ name: 'receipt', accept: ['image/*'] }]
					}
				}
			},
			workbox: {
				globPatterns: ['client/**/*.{js,css,ico,png,svg,webp,woff,woff2}'],
				navigateFallbackDenylist: [
					/^\/api/,
					/^\/auth/,
					/^\/export/,
					/^\/spends\/share/,
					/^\/receipts\//
				]
			},
			devOptions: {
				enabled: false
			}
		})
	],
	server: {
		port: 5173
	},
	optimizeDeps: {
		exclude: ['better-sqlite3', 'tesseract.js']
	},
	ssr: {
		// Biarkan tesseract.js di-import via dynamic import runtime, jangan pre-bundle.
		external: ['tesseract.js']
	}
});
