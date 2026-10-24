<script lang="ts">
	import { tools } from '$lib/tools';
</script>

<svelte:head><title>Dev Tools</title></svelte:head>

<div class="space-y-4">
	<header class="px-1">
		<h1 class="text-lg font-semibold sm:text-xl">Dev Tools</h1>
		<p class="text-sm opacity-60">
			Small utilities that run entirely in the browser — no data is sent to the server.
		</p>
	</header>

	<ul class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" role="list">
		{#each tools as t (t.slug)}
			<li>
				<a
					href="/tools/{t.slug}"
					class="block h-full rounded-box border border-base-300 bg-base-200/40 p-3 hover:border-base-content/40"
				>
					<div class="text-sm font-medium">{t.label}</div>
					<div class="mt-0.5 text-xs opacity-60">{t.description}</div>
				</a>
			</li>
		{/each}
	</ul>
</div>
