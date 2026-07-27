<script lang="ts">
	function isTypingTarget(el: EventTarget | null): boolean {
		if (!(el instanceof HTMLElement)) return false;
		if (el.isContentEditable) return true;
		const tag = el.tagName;
		return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
	}

	function focusFirstCaptureField() {
		const form = document.getElementById('capture-form');
		if (!form) return;
		const field = form.querySelector<HTMLElement>(
			'textarea, input:not([type="hidden"]):not([type="submit"]):not([type="button"])'
		);
		if (field) {
			field.focus();
			if (field instanceof HTMLTextAreaElement || field instanceof HTMLInputElement) {
				const len = field.value.length;
				field.setSelectionRange(len, len);
			}
			field.scrollIntoView({ block: 'center', behavior: 'smooth' });
		}
	}

	function focusSearch() {
		const el = document.getElementById('global-search');
		if (el instanceof HTMLInputElement) {
			el.focus();
			el.select();
			el.scrollIntoView({ block: 'center', behavior: 'smooth' });
		}
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.metaKey || e.ctrlKey || e.altKey) return;
		if (isTypingTarget(e.target)) return;
		if (e.key === '/') {
			e.preventDefault();
			focusSearch();
		} else if (e.key === 'n' || e.key === 'N') {
			e.preventDefault();
			focusFirstCaptureField();
		}
	}
</script>

<svelte:window onkeydown={onKeydown} />
