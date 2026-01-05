'use client'

import { Download, Loader, Moon, Settings, Sun, Trash2, Waypoints } from 'lucide-react'
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

type SidebarSettingsProps = {
	onWipe: () => void
	isWiping: boolean
	onDownloadAll?: () => void
	isDownloading?: boolean
	onOpenPipeline?: () => void
}

export function SidebarSettings({
	onWipe,
	isWiping,
	onDownloadAll,
	isDownloading = false,
	onOpenPipeline,
}: SidebarSettingsProps) {
	const { setTheme } = useTheme()
	const [isWipeAlertOpen, setIsWipeAlertOpen] = React.useState(false)

	const handleWipe = async () => {
		await onWipe()
		setIsWipeAlertOpen(false)
	}

	return (
		<>
			<div className="p-3 border-t mt-auto">
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="ghost" className="w-full justify-start gap-2">
							<Settings className="h-4 w-4" />
							Settings
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="start" side="top" className="w-48 ml-2">
						{onDownloadAll && (
							<DropdownMenuItem onClick={onDownloadAll} disabled={isDownloading}>
								{isDownloading ? (
									<Loader className="mr-2 h-4 w-4 animate-spin" />
								) : (
									<Download className="mr-2 h-4 w-4" />
								)}
								Download All
							</DropdownMenuItem>
						)}
						{onOpenPipeline && (
							<DropdownMenuItem onClick={onOpenPipeline}>
								<Waypoints className="mr-2 h-4 w-4" />
								Pipeline Status
							</DropdownMenuItem>
						)}
						<DropdownMenuSub>
							<DropdownMenuSubTrigger>
								<Sun className="h-4 w-4 mr-2 rotate-0 scale-100 dark:-rotate-90 dark:scale-0" />
								<Moon className="absolute h-4 w-4 rotate-90 scale-0 dark:rotate-0 dark:scale-100" />
								<span className="ml-2">Theme</span>
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
							disabled={isWiping}
							className="text-destructive focus:text-destructive focus:bg-destructive/10"
						>
							{isWiping ? (
								<Loader className="mr-2 h-4 w-4 animate-spin" />
							) : (
								<Trash2 className="mr-2 h-4 w-4" />
							)}
							Wipe Data
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>

			<AlertDialog open={isWipeAlertOpen} onOpenChange={setIsWipeAlertOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
						<AlertDialogDescription>
							This action cannot be undone. This will permanently delete all conversations and
							uploaded files.
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
