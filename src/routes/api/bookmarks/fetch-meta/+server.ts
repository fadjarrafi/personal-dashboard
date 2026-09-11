import { json, type RequestHandler } from '@sveltejs/kit';

const TIMEOUT_MS = 5000;

function decodeEntities(s: string): string {
	return s
		.replace(/&amp;/g, '&')
		.replace(/&quot;/g, '"')
		.replace(/&#39;|&apos;/g, "'")
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>');
}

function tagAttr(tag: string, attr: string): string | null {
	const m = tag.match(new RegExp(`${attr}\\s*=\\s*(["'])(.*?)\\1`, 'i'));
	return m ? decodeEntities(m[2]) : null;
}

function findOgImage(html: string): string | null {
	for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
		if ((tagAttr(tag, 'property') ?? '').toLowerCase() === 'og:image') return tagAttr(tag, 'content');
	}
	return null;
}

function findIconHref(html: string): string | null {
	for (const tag of html.match(/<link\b[^>]*>/gi) ?? []) {
		const rel = (tagAttr(tag, 'rel') ?? '').trim().toLowerCase();
		if (rel === 'icon' || rel === 'shortcut icon') return tagAttr(tag, 'href');
	}
	return null;
}

// Nilai ini hanya pernah berakhir di <img src>, jadi tolak skema selain
// http(s) (mis. javascript:/data:) sebagai lapisan pertahanan.
function toSafeAbsoluteUrl(raw: string | null, base: string): string | null {
	if (!raw) return null;
	try {
		const u = new URL(raw, base);
		return u.protocol === 'http:' || u.protocol === 'https:' ? u.href : null;
	} catch {
		return null;
	}
}

export const POST: RequestHandler = async ({ request }) => {
	let url: string;
	try {
		({ url } = await request.json());
	} catch {
		return json({ title: null, faviconUrl: null, previewImageUrl: null }, { status: 400 });
	}

	if (!url || !/^https?:\/\//i.test(url)) {
		return json({ title: null, faviconUrl: null, previewImageUrl: null }, { status: 400 });
	}

	const ctrl = new AbortController();
	const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);

	try {
		const res = await fetch(url, {
			signal: ctrl.signal,
			redirect: 'follow',
			headers: { 'user-agent': 'personal-dashboard/0.1 (+fetch-meta)' }
		});
		if (!res.ok) return json({ title: null, faviconUrl: null, previewImageUrl: null });

		const contentType = res.headers.get('content-type') ?? '';
		if (!contentType.includes('text/html')) {
			return json({ title: null, faviconUrl: null, previewImageUrl: null });
		}

		const html = (await res.text()).slice(0, 200_000);
		const finalUrl = res.url || url;

		const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
		const title = match?.[1]?.replace(/\s+/g, ' ').trim() ?? null;

		const previewImageUrl = toSafeAbsoluteUrl(findOgImage(html), finalUrl);
		const faviconUrl =
			toSafeAbsoluteUrl(findIconHref(html), finalUrl) ??
			toSafeAbsoluteUrl('/favicon.ico', finalUrl);

		return json({ title, faviconUrl, previewImageUrl });
	} catch {
		return json({ title: null, faviconUrl: null, previewImageUrl: null });
	} finally {
		clearTimeout(timer);
	}
};
