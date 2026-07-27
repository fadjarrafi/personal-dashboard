import daisyui from 'daisyui';

/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	theme: {
		extend: {
			fontFamily: {
				mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace']
			}
		}
	},
	plugins: [daisyui],
	daisyui: {
		themes: [
			{
				dashboard: {
					primary: '#38bdf8',
					'primary-content': '#0f172a',
					secondary: '#a78bfa',
					accent: '#22d3ee',
					neutral: '#1e293b',
					'base-100': '#0f172a',
					'base-200': '#111827',
					'base-300': '#1e293b',
					'base-content': '#e2e8f0',
					info: '#38bdf8',
					success: '#4ade80',
					warning: '#fbbf24',
					error: '#f87171'
				}
			},
			'light'
		],
		darkTheme: 'dashboard',
		logs: false
	}
};
