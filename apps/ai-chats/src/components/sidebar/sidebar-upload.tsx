'use client'

import { FileUp, Loader } from 'lucide-react'
import * as React from 'react'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'

import {
	deleteStagedConversationsAction,
	deleteStagedFilesAction,
	processConversationsAction,
	splitFileAction,
} from '@/lib/actions'

type SidebarUploadProps = {
	onFileUploaded?: () => void
}

export function SidebarUpload({ onFileUploaded }: SidebarUploadProps) {
	const [isDragging, setIsDragging] = React.useState(false)
	const [isUploading, setIsUploading] = React.useState(false)
	const fileInputRef = React.useRef<HTMLInputElement>(null)
	const { toast } = useToast()

	const handleDragOver = (e: React.DragEvent) => {
		e.preventDefault()
		setIsDragging(true)
	}

	const handleDragLeave = (e: React.DragEvent) => {
		e.preventDefault()
		setIsDragging(false)
	}

	const handleDrop = async (e: React.DragEvent) => {
		e.preventDefault()
		setIsDragging(false)

		const files = e.dataTransfer.files
		if (files.length > 0) {
			await handleUpload(files[0])
		}
	}

	const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = e.target.files
		if (files && files.length > 0) {
			await handleUpload(files[0])
		}
	}

	const handleUpload = async (file: File) => {
		if (
			!file.name.endsWith('.xml') &&
			!file.name.endsWith('.json') &&
			!file.name.endsWith('.txt')
		) {
			// Allowing txt for now as some exports might be raw text
			toast({
				variant: 'destructive',
				title: 'Invalid file',
				description: 'Please upload a .xml, .json, or .txt file',
			})
			return
		}

		setIsUploading(true)
		try {
			// 0. Auto-Cleanup (Optionally we could ask, but for drop-zone "Quick Import" style, auto-cleanup is standard)
			// Or should we append? The previous logic in ImportDialog did cleanup.
			// Let's stick to cleaning up staged files to avoid mixing.
			await deleteStagedFilesAction()
			await deleteStagedConversationsAction()

			// 1. Upload
			const formData = new FormData()
			formData.append('file', file)

			const response = await fetch('/api/upload', {
				method: 'POST',
				body: formData,
			})

			const result = await response.json()

			if (!result.success) throw new Error(result.error || 'Upload failed')

			const filename = result.filename
			toast({
				title: 'Upload complete',
				description: 'Processing file...',
			})

			// 2. Split
			const splitJobId = `split-${Date.now()}`
			// We await it here. Usually fast for XMLs.
			await splitFileAction(filename, splitJobId)

			// 3. Process
			const processJobId = `process-${Date.now()}`
			await processConversationsAction(processJobId)

			toast({
				title: 'Import Complete',
				description: `${file.name} has been processed.`,
			})
			onFileUploaded?.()
		} catch (error) {
			toast({
				variant: 'destructive',
				title: 'Import failed',
				description: error instanceof Error ? error.message : 'Could not process file',
			})
		} finally {
			setIsUploading(false)
			if (fileInputRef.current) {
				fileInputRef.current.value = ''
			}
		}
	}

	return (
		<div className="p-3 border-b">
			{/* biome-ignore lint/a11y/useSemanticElements: div needed for drag-drop */}
			<div
				role="button"
				tabIndex={0}
				onDragOver={handleDragOver}
				onDragLeave={handleDragLeave}
				onDrop={handleDrop}
				className={`
                    border-2 border-dashed rounded-lg p-4 text-center
                    transition-colors cursor-pointer
                    ${isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}
                    ${isUploading ? 'opacity-50 pointer-events-none' : 'hover:border-primary/50'}
                `}
				onClick={() => fileInputRef.current?.click()}
				onKeyDown={(e) => {
					if (e.key === 'Enter' || e.key === ' ') {
						fileInputRef.current?.click()
					}
				}}
			>
				<Input
					ref={fileInputRef}
					type="file"
					accept=".xml,.json,.txt"
					onChange={handleFileChange}
					className="hidden"
				/>
				{isUploading ? (
					<div className="flex flex-col items-center gap-2">
						<Loader className="h-6 w-6 animate-spin text-muted-foreground" />
						<span className="text-sm text-muted-foreground">Processing...</span>
					</div>
				) : (
					<div className="flex flex-col items-center gap-2">
						<FileUp className="h-6 w-6 text-muted-foreground" />
						<span className="text-sm text-muted-foreground">Drop XML/JSON or click</span>
					</div>
				)}
			</div>
		</div>
	)
}
