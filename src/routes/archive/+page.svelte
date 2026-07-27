<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	function preview(body: string | null, url: string | null): string {
		const src = body ?? url ?? '';
		return src.length > 100 ? src.slice(0, 100) + '…' : src;
	}
</script>

<div class="mb-4 flex flex-wrap items-center justify-between gap-2">
	<div class="min-w-0">
		<h1 class="text-lg font-semibold sm:text-xl">Arsip</h1>
		<p class="text-sm opacity-60">
			{data.items.length} item diarsipkan. Hard-delete hanya bisa dari sini.
		</p>
	</div>
	<a class="btn btn-ghost btn-sm tap-target" href="/">← Kembali</a>
</div>

{#if data.items.length === 0}
	<p class="rounded-box border border-dashed border-base-300 p-6 text-center text-sm opacity-60">
		Arsip kosong.
	</p>
{:else}
	<!-- Mobile: kartu -->
	<ul class="space-y-2 md:hidden" role="list">
		{#each data.items as item (item.id)}
			<li class="rounded-box border border-base-300 bg-base-200/40 p-3">
				<div class="mb-1 flex items-center justify-between gap-2">
					<span class="badge badge-ghost badge-sm font-mono">{item.type}</span>
					<time class="text-[10px] opacity-50">
						{(item.archivedAt ?? '').slice(0, 10)}
					</time>
				</div>
				{#if item.title}
					<div class="truncate text-sm font-medium">{item.title}</div>
				{:else if item.url}
					<div class="truncate text-sm text-primary">{item.url}</div>
				{/if}
				{#if item.body}
					<div class="mt-1 line-clamp-2 text-xs opacity-70 {item.type === 'snippet' ? 'font-mono' : ''}">
						{preview(item.body, item.url)}
					</div>
				{/if}
				<div class="mt-2 flex flex-wrap justify-end gap-1">
					<form method="post" action="?/unarchive">
						<input type="hidden" name="id" value={item.id} />
						<button class="btn btn-ghost btn-xs tap-target" type="submit" aria-label="Pulihkan">
							↺ Pulihkan
						</button>
					</form>
					<form method="post" action="?/delete">
						<input type="hidden" name="id" value={item.id} />
						<button
							class="btn btn-error btn-outline btn-xs tap-target"
							type="submit"
							onclick={(e) => {
								if (!confirm('Hapus permanen? Tindakan ini tidak bisa dibatalkan.')) {
									e.preventDefault();
								}
							}}
							aria-label="Hapus permanen"
						>
							Hapus
						</button>
					</form>
				</div>
			</li>
		{/each}
	</ul>

	<!-- Desktop: tabel -->
	<div class="hidden overflow-x-auto rounded-box border border-base-300 md:block">
		<table class="table table-sm">
			<thead>
				<tr class="text-xs uppercase tracking-wider">
					<th class="w-24">Tipe</th>
					<th>Judul / Isi</th>
					<th class="w-40">Diarsipkan</th>
					<th class="w-48 text-right">Aksi</th>
				</tr>
			</thead>
			<tbody>
				{#each data.items as item (item.id)}
					<tr class="hover">
						<td>
							<span class="badge badge-ghost badge-sm font-mono">{item.type}</span>
						</td>
						<td class="max-w-0">
							{#if item.title}
								<div class="truncate font-medium">{item.title}</div>
							{:else if item.url}
								<div class="truncate text-primary">{item.url}</div>
							{/if}
							{#if item.body}
								<div
									class="truncate text-xs opacity-60 {item.type === 'snippet' ? 'font-mono' : ''}"
								>
									{preview(item.body, item.url)}
								</div>
							{/if}
						</td>
						<td class="whitespace-nowrap text-xs opacity-60">
							{(item.archivedAt ?? '').slice(0, 16).replace('T', ' ')}
						</td>
						<td>
							<div class="flex justify-end gap-1">
								<form method="post" action="?/unarchive" style="display:inline">
									<input type="hidden" name="id" value={item.id} />
									<button class="btn btn-ghost btn-xs" type="submit" title="Kembalikan">
										↺ Pulihkan
									</button>
								</form>
								<form method="post" action="?/delete" style="display:inline">
									<input type="hidden" name="id" value={item.id} />
									<button
										class="btn btn-error btn-outline btn-xs"
										type="submit"
										onclick={(e) => {
											if (!confirm('Hapus permanen? Tindakan ini tidak bisa dibatalkan.')) {
												e.preventDefault();
											}
										}}
										title="Hapus permanen"
									>
										Hapus
									</button>
								</form>
							</div>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}
