// Definisi navigasi utama — dipakai sidebar/drawer di +layout.svelte dan
// command palette. `match` menentukan apakah link aktif untuk URL saat ini.
export interface NavLink {
	href: string;
	label: string;
	icon?: string;
	dot?: string | null;
	match: (url: URL) => boolean;
}

export interface NavSection {
	title: string;
	links: NavLink[];
}

const SECTION_PREFIXES = [
	'/archive',
	'/spends',
	'/bills',
	'/vault',
	'/tasks',
	'/boards',
	'/kanban',
	'/tools'
];

function isCatalog(url: URL): boolean {
	return !SECTION_PREFIXES.some((p) => url.pathname.startsWith(p));
}

function catalogType(type: string | null) {
	return (url: URL) => isCatalog(url) && url.searchParams.get('type') === type;
}

function under(prefix: string) {
	return (url: URL) => url.pathname.startsWith(prefix);
}

export const navSections: NavSection[] = [
	{
		title: 'Katalog',
		links: [
			{ href: '/', label: 'Semua', match: catalogType(null) },
			{
				href: '/?type=bookmark',
				label: 'Bookmark',
				dot: 'text-[--color-cat-bookmark]',
				match: catalogType('bookmark')
			},
			{
				href: '/?type=note',
				label: 'Note',
				dot: 'text-[--color-cat-note]',
				match: catalogType('note')
			},
			{
				href: '/?type=snippet',
				label: 'Snippet',
				dot: 'text-[--color-cat-snippet]',
				match: catalogType('snippet')
			}
		]
	},
	{
		title: 'Keuangan',
		links: [
			{ href: '/spends', label: 'Pengeluaran', dot: 'text-primary', match: under('/spends') },
			{ href: '/bills', label: 'Tagihan', dot: 'text-primary', match: under('/bills') }
		]
	},
	{
		title: 'Produktivitas',
		links: [
			{ href: '/tools', label: 'Dev Tools', icon: '⌘', match: under('/tools') },
			{ href: '/tasks', label: 'Tugas', match: under('/tasks') },
			{ href: '/kanban', label: 'Kanban', match: under('/kanban') },
			{ href: '/boards', label: 'Board', match: under('/boards') }
		]
	},
	{
		title: 'Lainnya',
		links: [
			{ href: '/vault', label: 'Vault', match: under('/vault') },
			{ href: '/archive', label: 'Arsip', match: (url) => url.pathname === '/archive' },
			{ href: '/export', label: 'Export JSON', icon: '↓', match: () => false }
		]
	}
];
