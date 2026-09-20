import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { reorderColumn, type TaskStatus } from '$lib/server/kanban';

const VALID_STATUS = new Set<TaskStatus>(['todo', 'in_progress', 'done']);

export const PATCH: RequestHandler = async ({ request, locals }) => {
	const user = locals.user;
	if (!user) throw error(401, 'Unauthorized');

	const body = (await request.json()) as { status?: string; orderedIds?: number[] };
	const status = body.status;
	const orderedIds = body.orderedIds;

	if (!status || !VALID_STATUS.has(status as TaskStatus) || !Array.isArray(orderedIds)) {
		throw error(400, 'Payload tidak valid');
	}
	if (!orderedIds.every((id) => Number.isInteger(id))) {
		throw error(400, 'orderedIds harus array integer');
	}

	reorderColumn(user.id, status as TaskStatus, orderedIds);
	return json({ ok: true });
};
