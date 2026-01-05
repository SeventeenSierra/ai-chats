// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2025 Seventeen Sierra LLC

'use client'

import { usePathname } from 'next/navigation'
import * as React from 'react'
import { useIsMobile } from '@/hooks/use-mobile'
import { cn } from '@/lib/utils'

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
	const pathname = usePathname()
	const isMobile = useIsMobile()

	React.useEffect(() => {
		// On mobile, the sidebar should always be closed by default.
		if (isMobile) {
			setIsOpen(false)
			return
		}

		// On desktop, it should be open only on the explorer page.
		const onExplorer = pathname.startsWith('/explorer')
		setIsOpen(onExplorer)
	}, [pathname, isMobile])

	const toggleSidebar = () => {
		setIsOpen((prev) => !prev)
	}

	return (
		<SidebarContext.Provider value={{ isOpen, toggleSidebar }}>{children}</SidebarContext.Provider>
	)
}

export const Sidebar = ({ children }: { children: React.ReactNode }) => {
	const { isOpen } = useSidebar()
	const pathname = usePathname()

	// Only render the sidebar on the explorer page
	if (!pathname.startsWith('/explorer')) {
		return null
	}

	return (
		<aside
			className={cn(
				'fixed inset-y-0 left-0 z-30 h-full w-80 transform bg-background border-r transition-transform duration-300 ease-in-out',
				'lg:pt-16', // Position below the header on large screens
				isOpen ? 'translate-x-0' : '-translate-x-full',
			)}
		>
			<div className="flex flex-col h-full">{children}</div>
		</aside>
	)
}

export const SidebarHeader = ({
	children,
	className,
}: {
	children: React.ReactNode
	className?: string
}) => {
	return <div className={cn('', className)}>{children}</div>
}

export const SidebarContent = ({
	children,
	className,
}: {
	children: React.ReactNode
	className?: string
}) => {
	return <div className={cn('flex flex-col flex-1 overflow-y-auto', className)}>{children}</div>
}

export const SidebarFooter = ({
	children,
	className,
}: {
	children: React.ReactNode
	className?: string
}) => {
	return <div className={cn('', className)}>{children}</div>
}
