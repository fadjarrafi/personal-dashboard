<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	function formatDate(iso: string): string {
		return iso.slice(0, 16).replace('T', ' ');
	}

	function vaultHref(path: string): string {
		return `/vault/${path.split('/').map(encodeURIComponent).join('/')}`;
	}
</script>

<svelte:head>
	<title>Vault · Dashboard</title>
</svelte:head>

<div class="grid gap-4 sm:gap-6 lg:grid-cols-3">
	<section class="card bg-base-200 lg:col-span-1">
		<div class="card-body p-3">
			<div class="flex items-center justify-between">
				<h2 class="font-display text-sm font-semibold uppercase tracking-wide opacity-70">Tugas</h2>
				<div class="flex gap-1">
					<a class="btn btn-ghost btn-xs" href="/vault/browse">Jelajahi vault</a>
					<a class="btn btn-ghost btn-xs" href="/vault/new">+ Note baru</a>
				</div>
			</div>

			<ul class="mt-2 space-y-1">
				{#each data.tasks as task (task.id)}
					<li class="flex items-center gap-2">
						<form method="post" action="?/toggleTask">
							<input type="hidden" name="id" value={task.id} />
							<button
								type="submit"
								class="btn btn-ghost btn-xs btn-circle"
								aria-label={task.done ? 'Tandai belum selesai' : 'Tandai selesai'}
							>
								{task.done ? '☑' : '☐'}
							</button>
						</form>
						<span class="text-sm {task.done ? 'line-through opacity-50' : ''}">{task.text}</span>
					</li>
				{:else}
					<li class="text-sm opacity-60">Belum ada tugas.</li>
				{/each}
			</ul>

			<form method="post" action="?/addTask" class="mt-3 flex gap-2">
				<input
					type="text"
					name="text"
					placeholder="Tugas baru..."
					class="input input-bordered input-sm flex-1"
					required
				/>
				<button class="btn btn-primary btn-sm" type="submit">Tambah</button>
			</form>
			<p class="mt-2 text-xs opacity-50">
				Tersimpan di <code>Dashboard Sync/Tasks.md</code> - juga bisa diedit langsung di Obsidian.
			</p>
		</div>
	</section>

	<section class="card bg-base-200 lg:col-span-1">
		<div class="card-body p-3">
			<h2 class="font-display text-sm font-semibold uppercase tracking-wide opacity-70">Journal</h2>
			<ul class="mt-2 space-y-2">
				{#each data.journal as note (note.path)}
					<li>
						<a class="link link-hover text-sm font-medium" href={vaultHref(note.path)}>{note.title}</a>
						<div class="text-xs opacity-60">{formatDate(note.updatedAt)}</div>
					</li>
				{:else}
					<li class="text-sm opacity-60">Tidak ada entri.</li>
				{/each}
			</ul>
		</div>
	</section>

	<section class="card bg-base-200 lg:col-span-1">
		<div class="card-body p-3">
			<h2 class="font-display text-sm font-semibold uppercase tracking-wide opacity-70">Roadmap</h2>
			<ul class="mt-2 space-y-2">
				{#each data.roadmap as note (note.path)}
					<li>
						<a class="link link-hover text-sm font-medium" href={vaultHref(note.path)}>{note.title}</a>
						{#if note.frontmatter.status}
							<span class="badge badge-outline badge-sm ml-2">{note.frontmatter.status}</span>
						{/if}
					</li>
				{:else}
					<li class="text-sm opacity-60">Tidak ada item.</li>
				{/each}
			</ul>
		</div>
	</section>

	<section class="card bg-base-200 lg:col-span-3">
		<div class="card-body p-3">
			<h2 class="font-display text-sm font-semibold uppercase tracking-wide opacity-70">
				Capture dari dashboard
			</h2>
			<ul class="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
				{#each data.captures as note (note.path)}
					<li class="rounded-lg bg-base-300/50 p-2">
						<a class="link link-hover text-sm font-medium" href={vaultHref(note.path)}>{note.title}</a>
						{#if note.excerpt}<p class="mt-1 truncate text-xs opacity-70">{note.excerpt}</p>{/if}
					</li>
				{:else}
					<li class="text-sm opacity-60">Belum ada capture.</li>
				{/each}
			</ul>
		</div>
	</section>
</div>
