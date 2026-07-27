<script lang="ts">
	import '../app.css';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: any } = $props();
</script>

<div class="mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-4">
	{#if data.user}
		<header class="navbar mb-4 rounded-box bg-base-200 px-3">
			<div class="flex-1">
				<a href="/" class="btn btn-ghost text-lg font-semibold normal-case">Dashboard</a>
			</div>
			<nav class="flex-none gap-1 text-sm">
				<a class="btn btn-ghost btn-sm" href="/">Semua</a>
				<a class="btn btn-ghost btn-sm" href="/?type=bookmark">Bookmark</a>
				<a class="btn btn-ghost btn-sm" href="/?type=note">Note</a>
				<a class="btn btn-ghost btn-sm" href="/?type=snippet">Snippet</a>
				<form method="post" action="/logout">
					<button class="btn btn-ghost btn-sm" type="submit">Keluar</button>
				</form>
			</nav>
		</header>
	{/if}

	<main class="flex-1">
		{@render children()}
	</main>

	<footer class="mt-6 pt-4 text-center text-xs opacity-60">
		Personal Dashboard · v0.1
	</footer>
</div>
