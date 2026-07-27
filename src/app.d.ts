declare global {
	namespace App {
		interface Locals {
			user: { id: number; email: string } | null;
			sessionId: string | null;
		}
		interface PageData {
			user: { id: number; email: string } | null;
		}
	}
}

export {};
