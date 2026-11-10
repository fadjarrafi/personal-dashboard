<script lang="ts">
	import ToolHeader from '$lib/components/tools/ToolHeader.svelte';
	import TextInput from '$lib/components/tools/TextInput.svelte';
	import MermaidLive from '$lib/components/tools/MermaidLive.svelte';
	import { Button } from '$lib/components/ui/button/index.js';

	const EXAMPLES: Record<string, string> = {
		Flowchart: `flowchart LR
  A[Share receipt] --> B{OCR ok?}
  B -- yes --> C[Prefill form]
  B -- no --> D[Manual entry]
  C --> E[(spends)]
  D --> E`,
		Sequence: `sequenceDiagram
  participant U as User
  participant S as Server
  participant DB as SQLite
  U->>S: POST /spends/share
  S->>DB: insert receipt
  DB-->>S: id
  S-->>U: 303 /spends/share/:id`,
		ER: `erDiagram
  USERS ||--o{ SPENDS : records
  USERS ||--o{ ITEMS : owns
  ITEMS }o--o{ TAGS : tagged`,
		State: `stateDiagram-v2
  [*] --> Todo
  Todo --> Doing
  Doing --> Done
  Doing --> Todo
  Done --> [*]`,
		Class: `classDiagram
  class Item {
    +int id
    +string title
    +pin()
  }
  class Bookmark
  Item <|-- Bookmark`
	};

	let source = $state(EXAMPLES.Flowchart);
</script>

<ToolHeader slug="mermaid" />

<div class="space-y-3">
	<div class="flex flex-wrap gap-1">
		<span class="label-mono me-1 self-center">Examples</span>
		{#each Object.keys(EXAMPLES) as name (name)}
			<Button variant="outline" size="xs" onclick={() => (source = EXAMPLES[name])}>{name}</Button>
		{/each}
	</div>
	<div class="grid gap-4 xl:grid-cols-2">
		<TextInput bind:value={source} label="Mermaid source" height="h-[32rem]" />
		<MermaidLive {source} filename="mermaid.svg" />
	</div>
</div>
