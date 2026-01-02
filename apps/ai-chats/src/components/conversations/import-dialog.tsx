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

export function ImportDialog({ open, onOpenChange, onFileUploaded }: ImportDialogProps) {
	const [file, setFile] = React.useState<File | null>(null)
	const [isUploading, setIsUploading] = React.useState(false)
	const [importResult, setImportResult] = React.useState<{
		imported: number
		errors: number
		total: number
	} | null>(null)
	const { toast } = useToast()

	const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const files = event.target.files
		if (files && files.length > 0) {
			setFile(files[0])
			setImportResult(null)
		}
	}

	const handleUpload = async () => {
		if (!file) {
			toast({
				variant: 'destructive',
				title: 'No file selected',
				description: 'Please choose a file to import.',
			})
			return
		}

		setIsUploading(true)
		setImportResult(null)

		try {
			// Upload file to S3 via API route
			const formData = new FormData()
			formData.append('file', file)

			const response = await fetch('/api/upload', {
				method: 'POST',
				body: formData,
			})

			const result = await response.json()

			if (result.success) {
				toast({
					title: 'Upload Complete',
					description: `File uploaded as ${result.filename}. Ready for processing.`,
				})
				onFileUploaded()
			} else {
				throw new Error(result.error || 'Upload failed')
			}
		} catch (error) {
			console.error('Upload error:', error)
			toast({
				variant: 'destructive',
				title: 'Upload Failed',
				description: error instanceof Error ? error.message : 'Could not upload the file.',
			})
		} finally {
			setIsUploading(false)
		}
	}

	React.useEffect(() => {
		if (open) {
			setFile(null)
			setIsUploading(false)
			setImportResult(null)
		}
	}, [open])

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				onInteractOutside={(e) => {
					if (isUploading) {
						e.preventDefault()
					}
				}}
			>
				<DialogHeader>
					<DialogTitle>Upload Conversation File</DialogTitle>
					<DialogDescription>
						Upload your Gemini XML export file. This will place it in the upload directory, ready
						for splitting.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4 py-4">
					<Input
						type="file"
						onChange={handleFileChange}
						disabled={isUploading}
						accept=".json,.xml"
					/>
					{importResult && (
						<div className="text-sm text-muted-foreground">
							✓ Imported {importResult.imported} of {importResult.total} conversations
							{importResult.errors > 0 && ` (${importResult.errors} errors)`}
						</div>
					)}
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)} disabled={isUploading}>
						Cancel
					</Button>

					<Button onClick={handleUpload} disabled={!file || isUploading}>
						{isUploading ? (
							<>
								<Loader className="mr-2 h-4 w-4 animate-spin" />
								Uploading...
							</>
						) : (
							'Upload'
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
