import { sveltekit } from '@sveltejs/kit/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		sveltekit(),
		SvelteKitPWA({
			registerType: 'autoUpdate',
			strategies: 'injectManifest',
			srcDir: 'src',
			filename: 'service-worker.ts',
			manifest: {
				name: 'Personal Dashboard',
				short_name: 'Dashboard',
				description: 'Bookmarks, notes, and snippets — capture fast, find fast.',
				theme_color: '#0f171c',
				background_color: '#0f171c',
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
			injectManifest: {
				globPatterns: ['client/**/*.{js,css,ico,png,svg,webp,woff,woff2}']
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
	},
	build: {
		rollupOptions: {
			// tesseract.js dipanggil lewat `await import('tesseract.js')` di
			// src/lib/server/receiptExtract.ts. Rollup tetap mencoba men-resolve
			// dynamic import ini saat build (walaupun `ssr.external` diset), lalu
			// gagal karena tesseract.js membawa worker + wasm yang tidak bisa
			// di-bundle. Externalize eksplisit -> output pakai require()/dynamic
			// import runtime yang di-resolve oleh Node dari node_modules.
			external: ['tesseract.js']
		}
	}
});
