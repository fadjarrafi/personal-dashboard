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
				dashboard: {
					primary: 'oklch(74% 0.13 227)',
					'primary-content': 'oklch(20% 0.016 235)',
					secondary: 'oklch(74% 0.12 245)',
					'secondary-content': 'oklch(20% 0.016 235)',
					accent: 'oklch(74% 0.13 227)',
					'accent-content': 'oklch(20% 0.016 235)',
					neutral: 'oklch(28% 0.02 235)',
					'neutral-content': 'oklch(94% 0.01 235)',
					'base-100': 'oklch(20% 0.016 235)',
					'base-200': 'oklch(23.5% 0.018 235)',
					'base-300': 'oklch(28% 0.02 235)',
					'base-content': 'oklch(94% 0.01 235)',
					info: 'oklch(74% 0.13 227)',
					'info-content': 'oklch(20% 0.016 235)',
					success: 'oklch(74% 0.15 152)',
					'success-content': 'oklch(20% 0.016 235)',
					warning: 'oklch(80% 0.15 80)',
					'warning-content': 'oklch(20% 0.016 235)',
					error: 'oklch(68% 0.18 25)',
					'error-content': 'oklch(97% 0.01 235)',

					'--rounded-box': '0.625rem',
					'--rounded-btn': '0.5rem',
					'--rounded-badge': '0.375rem',
					'--animation-btn': '0',
					'--btn-focus-scale': '1',
					'--tab-radius': '0.5rem'
				}
			},
			'light'
		],
		darkTheme: 'dashboard',
		logs: false
	}
};
