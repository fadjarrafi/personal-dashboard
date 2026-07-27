import { json, type RequestHandler } from '@sveltejs/kit';

const TIMEOUT_MS = 5000;

export const POST: RequestHandler = async ({ request }) => {
	let url: string;
	try {
		({ url } = await request.json());
	} catch {
		return json({ title: null }, { status: 400 });
	}

	if (!url || !/^https?:\/\//i.test(url)) {
		return json({ title: null }, { status: 400 });
	}

	const ctrl = new AbortController();
	const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);

	try {
		const res = await fetch(url, {
			signal: ctrl.signal,
			redirect: 'follow',
			headers: { 'user-agent': 'personal-dashboard/0.1 (+fetch-title)' }
		});
		if (!res.ok) return json({ title: null });

		const contentType = res.headers.get('content-type') ?? '';
		if (!contentType.includes('text/html')) return json({ title: null });

		const html = (await res.text()).slice(0, 200_000);
		const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
		const title = match?.[1]?.replace(/\s+/g, ' ').trim() ?? null;
		return json({ title });
	} catch {
		return json({ title: null });
	} finally {
		clearTimeout(timer);
	}
};
