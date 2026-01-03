// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2025 Seventeen Sierra LLC

'use client'

import { Download, Loader, Menu, Moon, MoreVertical, Sun, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useTheme } from 'next-themes'
import * as React from 'react'
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button, buttonVariants } from '@/components/ui/button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { downloadAllAction } from '@/lib/actions'

import { GeminiIcon } from '../icons'
import { useSidebar } from '../ui/sidebar'

type AppHeaderProps = {
	onWipe: () => void
	isWiping: boolean
	isJobRunning: boolean
}

export default function AppHeader({ onWipe, isWiping, isJobRunning }: AppHeaderProps) {
	const { toggleSidebar } = useSidebar()
	const { setTheme } = useTheme()

	const [isWipeAlertOpen, setIsWipeAlertOpen] = React.useState(false)
	const [isDownloading, setIsDownloading] = React.useState(false)

	const handleWipe = async () => {
		await onWipe()
		setIsWipeAlertOpen(false)
	}

	const handleDownloadAll = async () => {
		setIsDownloading(true)
		try {
			const result = await downloadAllAction()
			if (result.error || !result.zipContent) {
				throw new Error(result.error || 'No content returned from server.')
			}

			// Decode Base64 and trigger download
			const byteCharacters = atob(result.zipContent)
			const byteNumbers = new Array(byteCharacters.length)
			for (let i = 0; i < byteCharacters.length; i++) {
				byteNumbers[i] = byteCharacters.charCodeAt(i)
			}
			const byteArray = new Uint8Array(byteNumbers)
			const blob = new Blob([byteArray], { type: 'application/zip' })

			const url = window.URL.createObjectURL(blob)
			const a = document.createElement('a')
			a.href = url
			a.download = 'conversations.zip'
			document.body.appendChild(a)
			a.click()
			document.body.removeChild(a)
			window.URL.revokeObjectURL(url)
		} catch (error) {
			console.error('Download all error:', error)
		} finally {
			setIsDownloading(false)
		}
	}

	return (
		<>
			<header className="grid grid-cols-3 h-16 items-center px-4 md:px-6 border-b shrink-0 bg-background z-40 relative">
				<div className="flex items-center gap-2 justify-start">
					<Button variant="ghost" size="icon" className="lg:hidden" onClick={toggleSidebar}>
						<Menu className="h-6 w-6" />
						<span className="sr-only">Toggle Sidebar</span>
					</Button>
					<Link href="/vault" className="flex items-center gap-2">
						<GeminiIcon className="h-6 w-6" />
						<h1 className="text-lg font-semibold font-headline hidden sm:block">Gemini Oracle</h1>
					</Link>
				</div>

				<nav className="hidden md:flex items-center gap-2 justify-center">
					{/* Single View: No navigation needed */}
				</nav>

				<div className="flex items-center gap-2 justify-end">
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="ghost" size="icon">
								<MoreVertical className="h-5 w-5" />
								<span className="sr-only">Open menu</span>
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuSeparator />

							<DropdownMenuItem onClick={handleDownloadAll} disabled={isDownloading}>
								{isDownloading ? (
									<Loader className="mr-2 h-4 w-4 animate-spin" />
								) : (
									<Download className="mr-2 h-4 w-4" />
								)}
								<span>Download All</span>
							</DropdownMenuItem>
							<DropdownMenuSeparator />
							<DropdownMenuSub>
								<DropdownMenuSubTrigger>
									<Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
									<Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
									<span className="ml-2">Toggle Theme</span>
								</DropdownMenuSubTrigger>
								<DropdownMenuSubContent>
									<DropdownMenuItem onClick={() => setTheme('light')}>Light</DropdownMenuItem>
									<DropdownMenuItem onClick={() => setTheme('dark')}>Dark</DropdownMenuItem>
									<DropdownMenuItem onClick={() => setTheme('system')}>System</DropdownMenuItem>
								</DropdownMenuSubContent>
							</DropdownMenuSub>
							<DropdownMenuSeparator />
							<DropdownMenuItem
								onClick={() => setIsWipeAlertOpen(true)}
								disabled={isWiping || isJobRunning}
								className="text-destructive focus:text-destructive focus:bg-destructive/10"
							>
								{isWiping ? (
									<Loader className="mr-2 h-4 w-4 animate-spin" />
								) : (
									<Trash2 className="mr-2 h-4 w-4" />
								)}
								<span>Wipe Data</span>
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</header>

			<AlertDialog open={isWipeAlertOpen} onOpenChange={setIsWipeAlertOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
						<AlertDialogDescription>
							This action cannot be undone. This will permanently delete all conversations and
							uploaded files from the database and storage.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							className={buttonVariants({ variant: 'destructive' })}
							onClick={handleWipe}
						>
							Continue
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	)
}
