// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2025 Seventeen Sierra LLC

'use client'

import { Code, FileText, FolderOpen, Lightbulb, Plus, Search, Settings } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import * as React from 'react'
import { useIsMobile } from '@/hooks/use-mobile'
import { cn } from '@/lib/utils'
import { Button } from './button'
import { Input } from './input'
import { ScrollArea } from './scroll-area'

// --- Context ---
interface SidebarContextType {
	isOpen: boolean
	toggleSidebar: () => void
}

const SidebarContext = React.createContext<SidebarContextType | null>(null)

export const useSidebar = () => {
	const context = React.useContext(SidebarContext)
	if (!context) {
		throw new Error('useSidebar must be used within a SidebarProvider.')
	}
	return context
}

export const SidebarProvider = ({ children }: { children: React.ReactNode }) => {
	const [isOpen, setIsOpen] = React.useState(true)
	const isMobile = useIsMobile()

	React.useEffect(() => {
		if (isMobile) {
			setIsOpen(false)
		} else {
			setIsOpen(true)
		}
	}, [isMobile])

	const toggleSidebar = React.useCallback(() => {
		setIsOpen((prev) => !prev)
	}, [])

	return (
		<SidebarContext.Provider value={{ isOpen, toggleSidebar }}>{children}</SidebarContext.Provider>
	)
}

// --- Main Sidebar Shell ---
export const Sidebar = ({ children }: { children: React.ReactNode }) => {
	const { isOpen } = useSidebar()

	return (
		<aside
			className={cn(
				'fixed inset-y-0 left-0 z-30 h-full w-72 transform border-r bg-background/80 backdrop-blur-lg transition-transform duration-300 ease-in-out',
				'lg:pt-16', // Position below header
				isOpen ? 'translate-x-0' : '-translate-x-full',
			)}
		>
			<div className="flex flex-col h-full">{children}</div>
		</aside>
	)
}

// --- Sidebar Content (Main Layout) ---
export const SidebarContent = ({ children }: { children: React.ReactNode }) => {
	return (
		<div className="flex flex-col h-full">
			{/* Brand/Title */}
			<div className="p-4 border-b">
				<h1 className="text-xl font-bold tracking-tight">The Vault</h1>
				<p className="text-xs text-muted-foreground">Your AI conversation archive.</p>
			</div>

			{/* Search (static placeholder for now) */}
			<div className="p-3">
				<div className="relative">
					<Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
					<Input placeholder="Search..." className="pl-8 h-9 text-sm" disabled />
				</div>
			</div>

			{/* Smart Views */}
			<div className="px-3 py-2">
				<h2 className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
					Smart Views
				</h2>
				<nav className="space-y-1">
					<SidebarNavItem href="/vault" icon={<FolderOpen className="h-4 w-4" />}>
						All Conversations
					</SidebarNavItem>
					<SidebarNavItem href="/vault?activity=coding" icon={<Code className="h-4 w-4" />}>
						Coding
					</SidebarNavItem>
					<SidebarNavItem href="/vault?activity=research" icon={<Lightbulb className="h-4 w-4" />}>
						Deep Research
					</SidebarNavItem>
					<SidebarNavItem href="/vault?activity=writing" icon={<FileText className="h-4 w-4" />}>
						Writing & Prose
					</SidebarNavItem>
				</nav>
			</div>

			{/* Binders (Collections) */}
			<div className="px-3 py-2 mt-2">
				<h2 className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
					Binders
				</h2>
				<nav className="space-y-1">
					{/* Placeholder for dynamic binders */}
					<Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-muted-foreground">
						<Plus className="h-4 w-4" />
						New Binder
					</Button>
				</nav>
			</div>

			{/* Main scrollable content area (passed children, e.g., conversation list) */}
			<ScrollArea className="flex-1">{children}</ScrollArea>

			{/* Footer */}
			<div className="p-3 border-t mt-auto">
				<Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-muted-foreground">
					<Settings className="h-4 w-4" />
					Settings
				</Button>
			</div>
		</div>
	)
}

// --- Sidebar Nav Item ---
function SidebarNavItem({
	href,
	icon,
	children,
}: {
	href: string
	icon: React.ReactNode
	children: React.ReactNode
}) {
	const pathname = usePathname()
	const isActive = pathname === href || (href !== '/vault' && pathname.startsWith(href))

	return (
		<Link
			href={href}
			className={cn(
				'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
				isActive
					? 'bg-primary/10 text-primary'
					: 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
			)}
		>
			{icon}
			{children}
		</Link>
	)
}
