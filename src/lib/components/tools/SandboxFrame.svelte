<!--
	Iframe ber-sandbox untuk merender HTML milik user (Markdown preview, HTML preview, playground).
	Tanpa `allow-same-origin`, isi frame berjalan di origin opaque: tidak bisa membaca cookie sesi
	atau DOM dashboard, walaupun scripts diizinkan.
-->
<script lang="ts">
	let {
		html,
		scripts = false,
		title = 'Preview',
		class: className = 'h-80',
		width = '100%',
		frame = $bindable()
	}: {
		html: string;
		scripts?: boolean;
		title?: string;
		class?: string;
		width?: string;
		frame?: HTMLIFrameElement;
	} = $props();
</script>

<div class="bg-well flex justify-center overflow-auto rounded-md border">
	<iframe
		bind:this={frame}
		{title}
		class="bg-background block max-w-full {className}"
		style="width: {width}"
		sandbox={scripts ? 'allow-scripts allow-modals allow-forms' : ''}
		srcdoc={html}
	></iframe>
</div>
