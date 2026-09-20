import { json, type RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async () => {
	return json({ key: process.env.VAPID_PUBLIC_KEY ?? '' });
};
