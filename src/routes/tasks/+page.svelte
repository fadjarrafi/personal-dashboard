<script lang="ts">
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const priorityLabels: Record<string, string> = {
		low: 'Rendah',
		normal: 'Normal',
		high: 'Tinggi'
	};
	const priorityBadgeClass: Record<string, string> = {
		low: 'badge-ghost',
		normal: 'badge-ghost',
		high: 'badge-error'
	};
	const statusLabels: Record<string, string> = {
		done: 'Selesai',
		overdue: 'Lewat jatuh tempo',
		due_soon: 'Segera jatuh tempo',
		upcoming: 'Akan datang',
		no_due_date: 'Tanpa tanggal'
	};
	const statusBadgeClass: Record<string, string> = {
		done: 'badge-success',
		overdue: 'badge-error',
		due_soon: 'badge-warning',
		upcoming: 'badge-ghost',
		no_due_date: 'badge-ghost'
	};

	function shortDate(iso: string): string {
		return new Date(iso).toLocaleDateString('id-ID', {
			day: '2-digit',
			month: 'short',
			year: 'numeric'
		});
	}

	function dueLabel(days: number): string {
		if (days < 0) return `Telat ${Math.abs(days)} hari`;
		if (days === 0) return 'Jatuh tempo hari ini';
		return `${days} hari lagi`;
	}
</script>

<div class="grid gap-4 sm:gap-6 lg:grid-cols-[380px_1fr]">
	<aside class="order-2 space-y-3 lg:order-1 lg:sticky lg:top-4 lg:self-start">
		<section aria-labelledby="task-add-heading">
			<h2
				id="task-add-heading"
				class="mb-2 px-1 text-xs font-semibold uppercase tracking-wider opacity-60"
			>
				Tambah tugas
			</h2>
			<form
				method="post"
				action="?/create"
				class="card space-y-2 border-l-2 border-l-[--color-accent] bg-base-200 p-3 sm:p-4"
			>
				<label class="form-control w-full">
					<div class="label py-1"><span class="label-text text-xs">Judul</span></div>
					<input
						class="input input-bordered w-full"
						name="title"
						placeholder="Apa yang perlu dikerjakan?"
						required
						autocomplete="off"
					/>
				</label>

				<label class="form-control w-full">
					<div class="label py-1"><span class="label-text text-xs">Catatan</span></div>
					<textarea class="textarea textarea-bordered w-full" name="notes" rows="2"></textarea>
				</label>

				<label class="form-control w-full">
					<div class="label py-1"><span class="label-text text-xs">Jatuh tempo (opsional)</span></div>
					<input class="input input-bordered w-full" name="due_at" type="date" />
				</label>

				<label class="form-control w-full">
					<div class="label py-1"><span class="label-text text-xs">Prioritas</span></div>
					<select class="select select-bordered w-full" name="priority">
						{#each data.priorities as p}
							<option value={p} selected={p === 'normal'}>{priorityLabels[p]}</option>
						{/each}
					</select>
				</label>

				<label class="form-control w-full">
					<div class="label py-1"><span class="label-text text-xs">Tag (pisah dengan koma)</span></div>
					<input class="input input-bordered w-full" name="tags" list="known-tags" autocomplete="off" />
					<datalist id="known-tags">
						{#each data.tags as t}
							<option value={t}></option>
						{/each}
					</datalist>
				</label>

				<label class="label cursor-pointer justify-start gap-2">
					<input type="checkbox" name="pinned" class="checkbox checkbox-primary" />
					<span class="label-text">Pin ke atas</span>
				</label>

				<button class="btn btn-primary w-full" type="submit">Simpan</button>

				{#if form && 'error' in form && form.error}
					<div role="alert" class="alert alert-error py-2 text-sm">{form.error}</div>
				{/if}
			</form>
		</section>
	</aside>

	<section class="order-1 min-w-0 space-y-3 lg:order-2">
		<header class="flex flex-wrap items-center justify-between gap-2 px-1">
			<h1 class="text-lg font-semibold sm:text-xl">Tugas</h1>
			<div class="flex flex-wrap items-center gap-2 text-xs">
				<a
					class="btn btn-xs {data.includeDone ? 'btn-primary' : 'btn-ghost'}"
					href="?{new URLSearchParams({
						...(data.tag ? { tag: data.tag } : {}),
						...(data.includeDone ? {} : { done: '1' })
					}).toString()}"
				>
					Tampilkan selesai
				</a>
				{#if data.tags.length > 0}
					<form method="get" class="inline-flex items-center gap-1">
						{#if data.includeDone}<input type="hidden" name="done" value="1" />{/if}
						<select
							class="select select-bordered select-xs"
							name="tag"
							onchange={(e) => e.currentTarget.form?.submit()}
						>
							<option value="">Semua tag</option>
							{#each data.tags as t}
								<option value={t} selected={t === data.tag}>{t}</option>
							{/each}
						</select>
					</form>
				{/if}
			</div>
		</header>

		{#if data.tasks.length === 0}
			<p class="rounded-box border border-dashed border-base-300 p-6 text-center text-sm opacity-60">
				Belum ada tugas tercatat.
			</p>
		{:else}
			<ul class="space-y-2" role="list">
				{#each data.tasks as t (t.id)}
					<li class="rounded-box border border-base-300 bg-base-200/40 p-3">
						<div class="flex items-start justify-between gap-2">
							<form method="post" action="?/toggleDone" class="mt-0.5">
								<input type="hidden" name="id" value={t.id} />
								<button
									type="submit"
									class="tap-target flex h-6 w-6 items-center justify-center rounded-full border {t.doneAt
										? 'border-success bg-success text-success-content'
										: 'border-base-300'}"
									aria-label={t.doneAt ? 'Tandai belum selesai' : 'Tandai selesai'}
								>
									{#if t.doneAt}✓{/if}
								</button>
							</form>
							<a href="/tasks/{t.id}" class="min-w-0 flex-1">
								<div class="truncate text-sm font-medium {t.doneAt ? 'opacity-60 line-through' : ''}">
									{t.title}
								</div>
								<div class="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs opacity-70">
									<span class="badge {priorityBadgeClass[t.priority]} badge-sm">
										{priorityLabels[t.priority]}
									</span>
									<span class="badge {statusBadgeClass[t.status]} badge-sm">
										{statusLabels[t.status]}
									</span>
									{#if t.dueAt}
										<span>{shortDate(t.dueAt)}{#if t.daysUntilDue !== null} · {dueLabel(t.daysUntilDue)}{/if}</span>
									{/if}
									{#each t.tags as tag}
										<span class="chip">{tag}</span>
									{/each}
								</div>
							</a>
							<form method="post" action="?/togglePin">
								<input type="hidden" name="id" value={t.id} />
								<button
									type="submit"
									class="btn btn-ghost btn-xs {t.pinned ? 'text-warning' : 'opacity-40'}"
									aria-label={t.pinned ? 'Lepas pin' : 'Pin ke atas'}
								>
									★
								</button>
							</form>
						</div>
					</li>
				{/each}
			</ul>
		{/if}
	</section>
</div>
