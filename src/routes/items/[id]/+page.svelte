<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const item = $derived(data.item);
</script>

<h1 class="mb-4 text-xl font-semibold">Edit {item.type}</h1>

<form method="post" action="?/update" class="space-y-3">
	<label class="form-control w-full">
		<div class="label"><span class="label-text">Judul</span></div>
		<input class="input input-bordered w-full" name="title" value={item.title ?? ''} />
	</label>

	{#if item.type === 'bookmark'}
		<label class="form-control w-full">
			<div class="label"><span class="label-text">URL</span></div>
			<input class="input input-bordered w-full" type="url" name="url" value={item.url ?? ''} />
		</label>
	{/if}

	{#if item.type === 'snippet'}
		<label class="form-control w-full">
			<div class="label"><span class="label-text">Bahasa</span></div>
			<input class="input input-bordered w-full" name="language" value={item.language ?? ''} />
		</label>
	{/if}

	<label class="form-control w-full">
		<div class="label"><span class="label-text">Isi</span></div>
		<textarea
			class="textarea textarea-bordered w-full {item.type === 'snippet' ? 'font-mono' : ''}"
			name="body"
			rows="10">{item.body ?? ''}</textarea>
	</label>

	<label class="form-control w-full">
		<div class="label"><span class="label-text">Tag (pisah dengan koma)</span></div>
		<input
			class="input input-bordered w-full"
			name="tags"
			value={item.tags.join(', ')}
			list="known-tags"
		/>
		<datalist id="known-tags">
			{#each data.tags as t}
				<option value={t}></option>
			{/each}
		</datalist>
	</label>

	<label class="label cursor-pointer justify-start gap-2">
		<input type="checkbox" name="pinned" class="checkbox checkbox-primary" checked={!!item.pinned} />
		<span class="label-text">Pin ke atas</span>
	</label>

	<div class="flex justify-between pt-2">
		<button class="btn btn-primary" type="submit">Simpan</button>
		<button
			formaction="?/delete"
			formmethod="post"
			class="btn btn-ghost text-error"
			onclick={(e) => {
				if (!confirm('Hapus permanen?')) e.preventDefault();
			}}
		>
			Hapus
		</button>
	</div>
</form>
