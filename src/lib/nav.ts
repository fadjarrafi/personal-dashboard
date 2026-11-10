// Definisi navigasi utama — dipakai app sidebar (dashboard-01 block) dan
// command palette. `match` menentukan apakah link aktif untuk URL saat ini.
import type { Component } from 'svelte';
import LayoutGrid from '@lucide/svelte/icons/layout-grid';
import Bookmark from '@lucide/svelte/icons/bookmark';
import StickyNote from '@lucide/svelte/icons/sticky-note';
import Code from '@lucide/svelte/icons/code';
import Wallet from '@lucide/svelte/icons/wallet';
import ReceiptText from '@lucide/svelte/icons/receipt-text';
import Wrench from '@lucide/svelte/icons/wrench';
import ListChecks from '@lucide/svelte/icons/list-checks';
import Columns3 from '@lucide/svelte/icons/columns-3';
import PenTool from '@lucide/svelte/icons/pen-tool';
import Vault from '@lucide/svelte/icons/vault';
import Archive from '@lucide/svelte/icons/archive';
import Download from '@lucide/svelte/icons/download';

export interface NavLink {
	href: string;
	label: string;
	icon: Component;
	/** Tailwind text-colour class for the category dot shown next to the icon. */
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
		title: 'Catalog',
		links: [
			{ href: '/', label: 'All', icon: LayoutGrid, match: catalogType(null) },
			{
				href: '/?type=bookmark',
				label: 'Bookmark',
				icon: Bookmark,
				dot: 'text-cat-bookmark',
				match: catalogType('bookmark')
			},
			{
				href: '/?type=note',
				label: 'Note',
				icon: StickyNote,
				dot: 'text-cat-note',
				match: catalogType('note')
			},
			{
				href: '/?type=snippet',
				label: 'Snippet',
				icon: Code,
				dot: 'text-cat-snippet',
				match: catalogType('snippet')
			}
		]
	},
	{
		title: 'Finance',
		links: [
			{ href: '/spends', label: 'Spending', icon: Wallet, match: under('/spends') },
			{ href: '/bills', label: 'Bills', icon: ReceiptText, match: under('/bills') }
		]
	},
	{
		title: 'Productivity',
		links: [
			{ href: '/tools', label: 'Tools', icon: Wrench, match: under('/tools') },
			{ href: '/tasks', label: 'Tasks', icon: ListChecks, match: under('/tasks') },
			{ href: '/kanban', label: 'Kanban', icon: Columns3, match: under('/kanban') },
			{ href: '/boards', label: 'Boards', icon: PenTool, match: under('/boards') }
		]
	},
	{
		title: 'Other',
		links: [
			{ href: '/vault', label: 'Vault', icon: Vault, match: under('/vault') },
			{
				href: '/archive',
				label: 'Archive',
				icon: Archive,
				match: (url) => url.pathname === '/archive'
			},
			{ href: '/export', label: 'Export JSON', icon: Download, match: () => false }
		]
	}
];
