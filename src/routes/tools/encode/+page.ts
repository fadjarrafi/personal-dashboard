import { redirect } from '@sveltejs/kit';

// /tools/encode dipecah menjadi Base64, URL Encoder, dan Escape Tools.
export function load() {
	redirect(308, '/tools/base64');
}
