<script lang="ts">
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
</script>

<div class="mx-auto mt-8 w-full max-w-sm sm:mt-16">
	<div class="card bg-base-200 shadow-xl">
		<div class="card-body">
			<h1 class="card-title mb-4">Masuk</h1>
			<form method="post" class="space-y-3">
				<label class="form-control w-full">
					<div class="label"><span class="label-text">Email</span></div>
					<input
						class="input input-bordered w-full"
						type="email"
						name="email"
						required
						autocomplete="email"
						value={form?.email ?? ''}
					/>
				</label>

				<label class="form-control w-full">
					<div class="label"><span class="label-text">Password</span></div>
					<input
						class="input input-bordered w-full"
						type="password"
						name="password"
						required
						autocomplete="current-password"
					/>
				</label>

				{#if form?.error}
					<div role="alert" class="alert alert-error py-2 text-sm">{form.error}</div>
				{/if}

				<button class="btn btn-primary w-full" type="submit">Masuk</button>
			</form>
		</div>
	</div>
</div>
