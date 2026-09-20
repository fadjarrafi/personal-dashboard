import daisyui from 'daisyui';

/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	theme: {
		extend: {
			fontFamily: {
				sans: ['Geist Variable', 'ui-sans-serif', 'system-ui', 'sans-serif'],
				mono: ['Geist Mono Variable', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace']
			}
		}
	},
	plugins: [daisyui],
	daisyui: {
		themes: [
			{
				brutal: {
					primary: '#ffffff',
					'primary-content': '#000000',
					secondary: '#ffffff',
					'secondary-content': '#000000',
					accent: '#ffffff',
					'accent-content': '#000000',
					neutral: '#27272a',
					'neutral-content': '#ffffff',
					'base-100': '#000000',
					'base-200': '#09090b',
					'base-300': '#18181b',
					'base-content': '#ffffff',
					info: '#a1a1aa',
					'info-content': '#000000',
					success: '#ffffff',
					'success-content': '#000000',
					warning: '#fbbf24',
					'warning-content': '#000000',
					error: '#f87171',
					'error-content': '#000000',

					'--rounded-box': '0',
					'--rounded-btn': '0',
					'--rounded-badge': '0',
					'--animation-btn': '0',
					'--btn-focus-scale': '1',
					'--tab-radius': '0'
				}
			}
		],
		darkTheme: 'brutal',
		logs: false
	}
};
