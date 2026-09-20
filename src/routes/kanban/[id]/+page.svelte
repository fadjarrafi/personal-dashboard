<script lang="ts">
	import type { ActionData, PageData } from './$types';
	import { formatRupiah } from '$lib/format';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	const task = $derived(data.task);
	const tagsValue = $derived(task.tags.join(', '));
</script>

<div class="mx-auto max-w-2xl space-y-4">
	<div class="mb-2 flex flex-wrap items-center justify-between gap-2">
		<h1 class="text-lg font-semibold sm:text-xl">Edit task</h1>
		<a class="btn btn-ghost btn-sm tap-target" href="/kanban">← Kembali ke board</a>
	</div>

	<form method="post" action="?/update" class="space-y-3">
		<label class="form-control w-full">
			<div class="label"><span class="label-text">Judul</span></div>
			<input class="input input-bordered w-full" name="title" value={task.title} required />
		</label>

		<label class="form-control w-full">
			<div class="label"><span class="label-text">Deskripsi</span></div>
			<textarea class="textarea textarea-bordered w-full" name="description" rows="3"
				>{task.description ?? ''}</textarea
			>
		</label>

		<div class="grid grid-cols-2 gap-3">
			<label class="form-control w-full">
				<div class="label"><span class="label-text">Prioritas</span></div>
				<select class="select select-bordered w-full" name="priority">
					<option value="low" selected={task.priority === 'low'}>Rendah</option>
					<option value="medium" selected={task.priority === 'medium'}>Sedang</option>
					<option value="high" selected={task.priority === 'high'}>Tinggi</option>
				</select>
			</label>

			<label class="form-control w-full">
				<div class="label"><span class="label-text">Due date</span></div>
				<input
					class="input input-bordered w-full"
					name="due_date"
					type="date"
					value={task.dueDate ?? ''}
				/>
			</label>
		</div>

		<label class="form-control w-full">
			<div class="label"><span class="label-text">Tags (pisahkan dengan koma)</span></div>
			<input
				class="input input-bordered w-full"
				name="tags"
				value={tagsValue}
				list="kanban-tags"
				autocomplete="off"
			/>
			<datalist id="kanban-tags">
				{#each data.tagsList as t}
					<option value={t}></option>
				{/each}
			</datalist>
		</label>

		<label class="form-control w-full">
			<div class="label"><span class="label-text">Kaitkan ke pengeluaran (opsional)</span></div>
			<select class="select select-bordered w-full" name="spend_id">
				<option value="">— tidak ada —</option>
				{#each data.spendOptions as s}
					<option value={s.id} selected={task.spendId === s.id}>
						{formatRupiah(s.amount)} · {s.merchant ?? s.note ?? s.occurredAt.slice(0, 10)}
					</option>
				{/each}
			</select>
		</label>

		{#if form && 'error' in form && form.error}
			<div role="alert" class="alert alert-error py-2 text-sm">{form.error}</div>
		{/if}

		<div class="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-between">
			<div class="flex gap-2">
				<button
					formaction="?/archive"
					formmethod="post"
					class="btn btn-ghost btn-outline"
				>
					Arsipkan
				</button>
				<button
					formaction="?/delete"
					formmethod="post"
					class="btn btn-error btn-outline"
					onclick={(e) => {
						if (!confirm('Hapus task ini permanen?')) e.preventDefault();
					}}
				>
					Hapus
				</button>
			</div>
			<div class="flex gap-2 sm:justify-end">
				<a class="btn btn-ghost flex-1 sm:flex-none" href="/kanban">Batal</a>
				<button class="btn btn-primary flex-1 sm:flex-none" type="submit">Simpan</button>
			</div>
		</div>
	</form>

	<section class="rounded-box border border-base-300 bg-base-200/40 p-3">
		<h2 class="mb-2 text-xs font-semibold uppercase tracking-wider opacity-60">Checklist</h2>

		{#if task.checklist.length > 0}
			<ul class="mb-2 space-y-1">
				{#each task.checklist as item (item.id)}
					<li class="flex items-center gap-2">
						<form method="post" action="?/toggleChecklistItem" class="contents">
							<input type="hidden" name="item_id" value={item.id} />
							<button
								type="submit"
								class="btn btn-circle btn-xs {item.done ? 'btn-primary' : 'btn-outline'}"
								aria-pressed={!!item.done}
								aria-label={item.done ? 'Tandai belum selesai' : 'Tandai selesai'}
							>
								{#if item.done}✓{/if}
							</button>
						</form>
						<span class="flex-1 text-sm {item.done ? 'opacity-50 line-through' : ''}">
							{item.content}
						</span>
						<form method="post" action="?/deleteChecklistItem" class="contents">
							<input type="hidden" name="item_id" value={item.id} />
							<button type="submit" class="btn btn-ghost btn-xs" aria-label="Hapus item">
								✕
							</button>
						</form>
					</li>
				{/each}
			</ul>
		{:else}
			<p class="mb-2 text-xs opacity-50">Belum ada item checklist.</p>
		{/if}

		<form method="post" action="?/addChecklistItem" class="flex gap-1">
			<input
				class="input input-sm input-bordered w-full"
				name="content"
				placeholder="+ Tambah item checklist"
				autocomplete="off"
				required
			/>
			<button class="btn btn-sm btn-primary" type="submit">+</button>
		</form>
	</section>
</div>
