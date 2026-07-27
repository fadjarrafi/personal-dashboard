<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	function preview(body: string | null, url: string | null): string {
		const src = body ?? url ?? '';
		return src.length > 100 ? src.slice(0, 100) + '…' : src;
	}
</script>

<div class="mb-4 flex items-center justify-between">
	<div>
		<h1 class="text-xl font-semibold">Arsip</h1>
		<p class="text-sm opacity-60">
			{data.items.length} item diarsipkan. Hard-delete hanya bisa dari sini.
		</p>
	</div>
	<a class="btn btn-ghost btn-sm" href="/">← Kembali</a>
</div>

{#if data.items.length === 0}
	<p class="rounded-box border border-dashed border-base-300 p-6 text-center text-sm opacity-60">
		Arsip kosong.
	</p>
{:else}
	<div class="overflow-x-auto rounded-box border border-base-300">
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
