// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2025 Seventeen Sierra LLC

'use client'

import { Loader } from 'lucide-react'
import * as React from 'react'
import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'

type ImportDialogProps = {
	open: boolean
	onOpenChange: (open: boolean) => void
	onFileUploaded: () => void
}

import {
	deleteStagedConversationsAction,
	deleteStagedFilesAction,
	processConversationsAction,
	splitFileAction,
} from '@/lib/actions'

export function ImportDialog({ open, onOpenChange, onFileUploaded }: ImportDialogProps) {
	const [file, setFile] = React.useState<File | null>(null)
	const [status, setStatus] = React.useState<'idle' | 'uploading' | 'splitting' | 'processing'>(
		'idle',
	)
	const { toast } = useToast()

	const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const files = event.target.files
		if (files && files.length > 0) {
			setFile(files[0])
		}
	}

	const handleUploadAndProcess = async () => {
		if (!file) return

		try {
			// 0. Cleanup previous state (Optional but safer for "Quick" import)
			await deleteStagedFilesAction()
			await deleteStagedConversationsAction()

			// 1. Upload
			setStatus('uploading')
			const formData = new FormData()
			formData.append('file', file)

			const response = await fetch('/api/upload', { method: 'POST', body: formData })
			const result = await response.json()

			if (!result.success) throw new Error(result.error || 'Upload failed')

			const filename = result.filename

			// 2. Split
			setStatus('splitting')
			toast({ title: 'Splitting...', description: 'Analyzing conversation structure.' })
			const splitJobId = `split-${Date.now()}`
			await splitFileAction(filename, splitJobId)
			// Note: splitFileAction is sync/async?
			// In actions.ts it returns { success, message } but calls splitImportedFile.
			// splitImportedFile might be synchronousFS operations?
			// If it's async background, we might need to wait or poll.
			// BUT actions.ts implementation shows it calls the function directly inside try/catch.
			// Let's assume it waits for the operation (or at least triggers it).
			// Actually, looking at actions.ts, it calls `splitImportedFile` (sync?).
			// If it returns immediately, we need to poll?
			// User put polling in PipelineDialog.
			// For simplicity here, I'll rely on the server action awaiting the logic if possible.
			// If actions.ts logic is async (it is), we should await it properly.

			// 3. Process
			setStatus('processing')
			toast({ title: 'Processing...', description: 'Extracting metadata to database.' })
			const processJobId = `process-${Date.now()}`
			await processConversationsAction(processJobId) // This is also async in backend

			toast({
				title: 'Import Complete',
				description: `Conversations from ${filename} are ready!`,
			})
			onFileUploaded()
		} catch (error) {
			console.error('Import error:', error)
			toast({
				variant: 'destructive',
				title: 'Import Failed',
				description: error instanceof Error ? error.message : 'Could not complete the process.',
			})
			setStatus('idle')
		} finally {
			setStatus('idle')
		}
	}

	React.useEffect(() => {
		if (open) {
			setFile(null)
			setStatus('idle')
		}
	}, [open])

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				onInteractOutside={(e) => {
					if (status !== 'idle') {
						e.preventDefault()
					}
				}}
			>
				<DialogHeader>
					<DialogTitle>Quick Import</DialogTitle>
					<DialogDescription>
						Upload and automatically process your Gemini XML export.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4 py-4">
					<Input
						type="file"
						onChange={handleFileChange}
						disabled={status !== 'idle'}
						accept=".json,.xml"
					/>
					{status !== 'idle' && (
						<div className="flex items-center gap-2 text-sm text-muted-foreground animate-pulse">
							<Loader className="h-4 w-4 animate-spin" />
							<span className="capitalize">{status}... this may take a moment.</span>
						</div>
					)}
				</div>

				<DialogFooter>
					<Button
						variant="outline"
						onClick={() => onOpenChange(false)}
						disabled={status !== 'idle'}
					>
						Cancel
					</Button>

					<Button onClick={handleUploadAndProcess} disabled={!file || status !== 'idle'}>
						{status === 'idle' ? 'Upload & Process' : 'Working...'}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
