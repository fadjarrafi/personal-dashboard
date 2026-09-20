<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	function relTime(iso: string): string {
		const diffMs = Date.now() - new Date(iso).getTime();
		const mins = Math.round(diffMs / 60_000);
		if (mins < 1) return 'baru saja';
		if (mins < 60) return `${mins} menit lalu`;
		const hours = Math.round(mins / 60);
		if (hours < 24) return `${hours} jam lalu`;
		const days = Math.round(hours / 24);
		return `${days} hari lalu`;
	}
</script>

<div class="space-y-4">
	<header class="flex items-center justify-between gap-2 px-1">
		<h1 class="text-lg font-semibold sm:text-xl">Board</h1>
		<form method="post" action="?/create" class="flex items-center gap-2">
			<input
				class="input input-bordered input-sm"
				name="title"
				placeholder="Judul board baru"
				autocomplete="off"
			/>
			<button class="btn btn-primary btn-sm" type="submit">Board baru</button>
		</form>
	</header>

	{#if data.boards.length === 0}
		<p class="rounded-box border border-dashed border-base-300 p-6 text-center text-sm opacity-60">
			Belum ada board. Buat satu untuk mulai brainstorming bebas.
		</p>
	{:else}
		<ul class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" role="list">
			{#each data.boards as b (b.id)}
				<li class="rounded-box border border-base-300 bg-base-200/40 p-3">
					<a href="/boards/{b.id}" class="block">
						<div class="truncate text-sm font-medium">{b.title}</div>
						<div class="mt-0.5 text-xs opacity-60">Diperbarui {relTime(b.updatedAt)}</div>
					</a>
					<div class="mt-2 flex justify-end gap-2">
						<form method="post" action="?/archive">
							<input type="hidden" name="id" value={b.id} />
							<button class="btn btn-ghost btn-xs tap-target" type="submit">Arsipkan</button>
						</form>
						<form
							method="post"
							action="?/delete"
							onsubmit={(e) => {
								if (!confirm('Hapus board ini beserta isinya?')) e.preventDefault();
							}}
						>
							<input type="hidden" name="id" value={b.id} />
							<button class="btn btn-error btn-outline btn-xs tap-target" type="submit">Hapus</button
							>
						</form>
					</div>
				</li>
			{/each}
		</ul>
	{/if}
</div>
