// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2025 Seventeen Sierra LLC

'use client'

import { CheckCircle2, Loader2, UploadCloud, XCircle } from 'lucide-react'
import * as React from 'react'
import { Progress } from '@/components/ui/progress'
import { getImportJobStatusAction } from '@/lib/actions'
import { cn } from '@/lib/utils'

type UploadStatus =
	| 'idle'
	| 'uploading'
	| 'splitting'
	| 'processing'
	| 'fetching'
	| 'complete'
	| 'error'

type UploadZoneProps = {
	onUploadComplete: () => void
	className?: string
}

export function UploadZone({ onUploadComplete, className }: UploadZoneProps) {
	const [status, setStatus] = React.useState<UploadStatus>('idle')
	const [progress, setProgress] = React.useState(0)
	const [statusMessage, setStatusMessage] = React.useState('')
	const [isDragging, setIsDragging] = React.useState(false)
	const [errorMessage, setErrorMessage] = React.useState<string | null>(null)
	const fileInputRef = React.useRef<HTMLInputElement>(null)
	const pollIntervalRef = React.useRef<NodeJS.Timeout | null>(null)

	// Cleanup polling on unmount
	React.useEffect(() => {
		return () => {
			if (pollIntervalRef.current) {
				clearInterval(pollIntervalRef.current)
			}
		}
	}, [])

	const stopPolling = () => {
		if (pollIntervalRef.current) {
			clearInterval(pollIntervalRef.current)
			pollIntervalRef.current = null
		}
	}

	const startPolling = (jobId: string) => {
		// Poll every 1.5 seconds
		pollIntervalRef.current = setInterval(async () => {
			try {
				// Check all 3 job stages
				const [splitJob, processJob, fetchJob] = await Promise.all([
					getImportJobStatusAction(`${jobId}-split`),
					getImportJobStatusAction(`${jobId}-process`),
					getImportJobStatusAction(`${jobId}-fetch`),
				])

				// Determine current stage
				if (splitJob && splitJob.status !== 'completed') {
					setStatus('splitting')
					setProgress(splitJob.progress ?? 10)
					setStatusMessage(splitJob.message ?? 'Splitting file...')
				} else if (processJob && processJob.status !== 'completed') {
					setStatus('processing')
					setProgress(33 + (processJob.progress ?? 0) * 0.33)
					setStatusMessage(processJob.message ?? 'Processing conversations...')
				} else if (fetchJob && fetchJob.status !== 'completed') {
					setStatus('fetching')
					setProgress(66 + (fetchJob.progress ?? 0) * 0.34)
					setStatusMessage(fetchJob.message ?? 'Fetching transcripts...')
				} else if (fetchJob && fetchJob.status === 'completed') {
					// All done!
					setStatus('complete')
					setProgress(100)
					setStatusMessage('Import complete!')
					stopPolling()

					setTimeout(() => {
						setStatus('idle')
						setProgress(0)
						onUploadComplete()
					}, 2000)
				}
			} catch (error) {
				console.error('Polling error:', error)
			}
		}, 1500)
	}

	const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault()
		e.stopPropagation()
		setIsDragging(true)
	}

	const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault()
		e.stopPropagation()
		setIsDragging(false)
	}

	const processFile = async (file: File) => {
		setStatus('uploading')
		setProgress(5)
		setStatusMessage('Uploading file...')
		setErrorMessage(null)

		try {
			const formData = new FormData()
			formData.append('file', file)

			const response = await fetch('/api/upload', {
				method: 'POST',
				body: formData,
			})

			const result = await response.json()

			if (!result.success) {
				throw new Error(result.error || 'Upload failed')
			}

			setProgress(10)
			setStatus('splitting')
			setStatusMessage('Starting processing...')

			// Start polling for job status
			if (result.jobId) {
				startPolling(result.jobId)
			} else {
				// Fallback: no jobId, just mark complete after delay
				setTimeout(() => {
					setStatus('complete')
					setProgress(100)
					setStatusMessage('Import complete!')
					setTimeout(() => {
						setStatus('idle')
						setProgress(0)
						onUploadComplete()
					}, 1500)
				}, 5000)
			}
		} catch (error) {
			setStatus('error')
			setErrorMessage(error instanceof Error ? error.message : 'An unknown error occurred.')
			setProgress(0)
			stopPolling()
		}
	}

	const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault()
		e.stopPropagation()
		setIsDragging(false)

		const files = e.dataTransfer.files
		if (files && files.length > 0) {
			processFile(files[0])
		}
	}

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = e.target.files
		if (files && files.length > 0) {
			processFile(files[0])
		}
	}

	const handleClick = () => {
		if (status === 'idle' || status === 'error') {
			fileInputRef.current?.click()
		}
	}

	const isProcessing = ['uploading', 'splitting', 'processing', 'fetching'].includes(status)

	return (
		<section
			aria-label="File upload drop zone"
			onDragOver={handleDragOver}
			onDragLeave={handleDragLeave}
			onDrop={handleDrop}
			className={cn(
				'relative flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-xl transition-all duration-300',
				isDragging
					? 'border-primary bg-primary/10 scale-[1.02]'
					: 'border-muted-foreground/30 bg-card hover:border-primary/50 hover:bg-muted/50',
				status === 'error' && 'border-destructive bg-destructive/10',
				status === 'complete' && 'border-green-500 bg-green-500/10',
				isProcessing && 'pointer-events-none',
				className,
			)}
		>
			<input
				ref={fileInputRef}
				type="file"
				accept=".xml,.json"
				onChange={handleFileChange}
				className="hidden"
			/>

			{/* Clickable button overlay - covers the whole drop zone */}
			<button
				type="button"
				onClick={handleClick}
				disabled={isProcessing}
				className="absolute inset-0 w-full h-full cursor-pointer disabled:cursor-default bg-transparent border-0"
				aria-label="Upload file"
			/>

			{/* Icon */}
			<div className="mb-4 pointer-events-none">
				{status === 'idle' && <UploadCloud className="h-12 w-12 text-muted-foreground" />}
				{isProcessing && <Loader2 className="h-12 w-12 text-primary animate-spin" />}
				{status === 'complete' && <CheckCircle2 className="h-12 w-12 text-green-500" />}
				{status === 'error' && <XCircle className="h-12 w-12 text-destructive" />}
			</div>

			{/* Status Text */}
			<p
				className={cn(
					'text-sm font-medium text-center pointer-events-none',
					status === 'error' ? 'text-destructive' : 'text-muted-foreground',
				)}
			>
				{status === 'idle' && 'Drag & drop your Gemini export file, or click to browse.'}
				{status === 'error' && (errorMessage || 'An error occurred.')}
				{(isProcessing || status === 'complete') && statusMessage}
			</p>

			{/* Progress Bar */}
			{isProcessing && (
				<div className="w-full max-w-xs mt-4 pointer-events-none">
					<Progress value={progress} className="h-2" />
					<p className="text-xs text-muted-foreground text-center mt-1">{Math.round(progress)}%</p>
				</div>
			)}
		</section>
	)
}
