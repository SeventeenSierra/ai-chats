'use client'

import type * as React from 'react'
import { SidebarSettings } from '@/components/sidebar/sidebar-settings'
import { SidebarUpload } from '@/components/sidebar/sidebar-upload'
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader } from '@/components/ui/sidebar'

type AppSidebarProps = {
	children: React.ReactNode
	onFileUploaded: () => void
	onWipe: () => void
	isWiping: boolean
	onDownloadAll: () => void
	isDownloading: boolean
	onOpenPipeline: () => void
}

export function AppSidebar({
	children,
	onFileUploaded,
	onWipe,
	isWiping,
	onDownloadAll,
	isDownloading,
	onOpenPipeline,
}: AppSidebarProps) {
	return (
		<Sidebar>
			<SidebarHeader className="border-b p-0">
				<SidebarUpload onFileUploaded={onFileUploaded} />
			</SidebarHeader>

			<SidebarContent>{children}</SidebarContent>

			<SidebarFooter className="border-t p-0">
				<SidebarSettings
					onWipe={onWipe}
					isWiping={isWiping}
					onDownloadAll={onDownloadAll}
					isDownloading={isDownloading}
					onOpenPipeline={onOpenPipeline}
				/>
			</SidebarFooter>
		</Sidebar>
	)
}
