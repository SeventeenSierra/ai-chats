// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2025 Seventeen Sierra LLC

'use client'

import * as React from 'react'
import { ImportDialog } from '@/components/conversations/import-dialog'
import { PipelineProgress } from '@/components/pipeline/pipeline-progress'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import { Toaster } from '@/components/ui/toaster'
import { useToast } from '@/hooks/use-toast'
import {
	addBacklinksAction,
	checkForExistingUploadsAction,
	deleteStagedConversationsAction,
	deleteStagedFilesAction,
	deleteUploadedFileAction,
	fetchTranscriptsAction,
	getConversationsAction,
	getImportJobStatusAction,
	listStagedFilesAction,
	processConversationsAction,
	splitFileAction,
} from '@/lib/actions'
import type { ImportJob } from '@/types'
import { ScrollArea } from '../ui/scroll-area'

type PipelineDialogProps = {
	open: boolean
	onOpenChange: (open: boolean) => void
}

export function PipelineDialog({ open, onOpenChange }: PipelineDialogProps) {
	const [isSplitting, setIsSplitting] = React.useState(false)
	const [isProcessing, setIsProcessing] = React.useState(false)
	const [isFetching, setIsFetching] = React.useState(false)
	const [isBacklinking, setIsBacklinking] = React.useState(false)
	const [job, setJob] = React.useState<ImportJob | null>(null)
	const [isImportDialogOpen, setIsImportDialogOpen] = React.useState(false)
	const [uploadedFile, setUploadedFile] = React.useState<string | null>(null)
	const [stagedFileCount, setStagedFileCount] = React.useState(0)
	const [processedFileCount, setProcessedFileCount] = React.useState(0)
	const [fetchedTranscriptCount, setFetchedTranscriptCount] = React.useState(0)
	const [backlinkedCount, setBacklinkedCount] = React.useState(0)
	const [isCheckingPipeline, setIsCheckingPipeline] = React.useState(true)

	const { toast } = useToast()
	const pollInterval = React.useRef<ReturnType<typeof setInterval> | null>(null)

	const clearPolling = React.useCallback(() => {
		if (pollInterval.current) {
			clearInterval(pollInterval.current)
			pollInterval.current = null
		}
	}, [])

	const checkPipelineStatus = React.useCallback(async () => {
		setIsCheckingPipeline(true)
		try {
			const { filename } = await checkForExistingUploadsAction()
			setUploadedFile(filename)

			// Use S3-based listing for staged files
			const stagedFiles = await listStagedFilesAction()
			setStagedFileCount(stagedFiles.length)

			// Use PostgreSQL-based conversation fetching
			const convos = await getConversationsAction()
			setProcessedFileCount(convos.length)

			if (convos.length > 0) {
				const fetchedCount = convos.filter((c) => c.transcript).length
				setFetchedTranscriptCount(fetchedCount)

				const backlinkedCount = convos.filter((c) => c.backlinkedAt).length
				setBacklinkedCount(backlinkedCount)
			} else {
				setFetchedTranscriptCount(0)
				setBacklinkedCount(0)
			}
		} catch (error) {
			console.error('Failed to check pipeline status:', error)
			setUploadedFile(null)
			setStagedFileCount(0)
			setProcessedFileCount(0)
			setFetchedTranscriptCount(0)
			setBacklinkedCount(0)
		} finally {
			setIsCheckingPipeline(false)
		}
	}, [])

	React.useEffect(() => {
		if (open) {
			checkPipelineStatus()
		}
		return () => clearPolling()
	}, [open, checkPipelineStatus, clearPolling])

	const startPolling = React.useCallback(
		(jobId: string, onComplete: () => void) => {
			pollInterval.current = setInterval(async () => {
				try {
					// Use PostgreSQL-based job status
					const jobStatus = await getImportJobStatusAction(jobId)
					if (jobStatus) {
						setJob(jobStatus as ImportJob)
						if (
							jobStatus.status === 'completed' ||
							jobStatus.status === 'failed' ||
							jobStatus.status === 'cancelled'
						) {
							clearPolling()
							await checkPipelineStatus()
							onComplete()
							toast({
								title: `Step Complete: ${jobStatus.status}`,
								description: jobStatus.message,
							})
						}
					} else {
						clearPolling()
						await checkPipelineStatus()
						onComplete()
					}
				} catch (error) {
					console.error('Error polling for import status:', error)
					toast({
						variant: 'destructive',
						title: 'Error',
						description: 'Could not get import status.',
					})
					clearPolling()
					onComplete()
				}
			}, 2000)
		},
		[clearPolling, toast, checkPipelineStatus],
	)

	const handleFileUploaded = async () => {
		toast({ title: 'Upload Complete', description: 'Your file is ready to be processed.' })
		await checkPipelineStatus()
		setIsImportDialogOpen(false)
	}

	const handleSplitFile = async () => {
		if (!uploadedFile) return
		setIsSplitting(true)
		const jobId = `split-${Date.now()}`
		setJob({
			jobId,
			filename: uploadedFile,
			status: 'starting',
			createdAt: new Date().toISOString(),
		})
		await splitFileAction(uploadedFile, jobId)
		startPolling(jobId, () => setIsSplitting(false))
	}

	const handleProcessFiles = async () => {
		setIsProcessing(true)
		const jobId = `process-${Date.now()}`
		setJob({ jobId, filename: 'N/A', status: 'starting', createdAt: new Date().toISOString() })
		await processConversationsAction(jobId)
		startPolling(jobId, () => setIsProcessing(false))
	}

	const handleFetchTranscripts = async () => {
		setIsFetching(true)
		const jobId = `fetch-${Date.now()}`
		setJob({ jobId, filename: 'N/A', status: 'starting', createdAt: new Date().toISOString() })
		await fetchTranscriptsAction(jobId)
		startPolling(jobId, () => setIsFetching(false))
	}

	const handleAddBacklinks = async () => {
		setIsBacklinking(true)
		const jobId = `backlink-${Date.now()}`
		setJob({ jobId, filename: 'N/A', status: 'starting', createdAt: new Date().toISOString() })
		await addBacklinksAction(jobId)
		startPolling(jobId, () => setIsBacklinking(false))
	}

	const handleResetUpload = async () => {
		if (!uploadedFile) return
		try {
			await deleteUploadedFileAction(uploadedFile)
			toast({ title: 'Upload Reset', description: `File ${uploadedFile} has been deleted.` })
			await checkPipelineStatus()
		} catch (_error) {
			toast({ variant: 'destructive', title: 'Error', description: 'Could not reset the upload.' })
		}
	}

	const handleResetStaging = async () => {
		try {
			await deleteStagedFilesAction()
			toast({ title: 'Staging Reset', description: 'Staged files have been deleted.' })
			await checkPipelineStatus()
		} catch (_error) {
			toast({
				variant: 'destructive',
				title: 'Error',
				description: 'Could not reset staging area.',
			})
		}
	}

	const handleResetProcessing = async () => {
		try {
			await deleteStagedConversationsAction()
			toast({
				title: 'Processing Reset',
				description: 'Extracted conversation data has been deleted.',
			})
			await checkPipelineStatus()
		} catch (_error) {
			toast({
				variant: 'destructive',
				title: 'Error',
				description: 'Could not reset processed data.',
			})
		}
	}

	const _isJobRunning = isSplitting || isProcessing || isFetching || isBacklinking
	const _isStage1Complete = !!uploadedFile
	const _isStage2Complete = stagedFileCount > 0 && !isSplitting
	const _isStage3Complete = processedFileCount > 0 && !isProcessing

	// Stage 4 is "complete" for the UI if all processed files have had their transcripts fetched.
	const _isStage4Complete =
		fetchedTranscriptCount > 0 && fetchedTranscriptCount === processedFileCount && !isFetching

	// Backlinking is available as long as there is at least one fetched transcript that has not been backlinked.
	const _canBacklink = fetchedTranscriptCount > backlinkedCount

	// Stage 5 is "complete" if all fetched transcripts have been backlinked.
	const _isStage5Complete =
		fetchedTranscriptCount > 0 && backlinkedCount === fetchedTranscriptCount && !isBacklinking

	return (
		<>
			<Dialog open={open} onOpenChange={onOpenChange}>
				<DialogContent className="max-w-2xl">
					<DialogHeader>
						<DialogTitle>Import & Processing Pipeline</DialogTitle>
						<DialogDescription>
							Follow these steps to import, process, and enrich your Gemini conversations.
						</DialogDescription>
					</DialogHeader>
					<ScrollArea className="max-h-[70vh] p-4">
						<PipelineProgress
							isLoading={isCheckingPipeline}
							job={job}
							uploadedFile={uploadedFile}
							stagedFileCount={stagedFileCount}
							processedFileCount={processedFileCount}
							fetchedTranscriptCount={fetchedTranscriptCount}
							backlinkedCount={backlinkedCount}
							isSplitting={isSplitting}
							isProcessing={isProcessing}
							isFetching={isFetching}
							isBacklinking={isBacklinking}
							onUploadOpen={() => setIsImportDialogOpen(true)}
							onResetUpload={handleResetUpload}
							onSplitFile={handleSplitFile}
							onResetStaging={handleResetStaging}
							onProcessFiles={handleProcessFiles}
							onResetProcessing={handleResetProcessing}
							onFetchTranscripts={handleFetchTranscripts}
							onAddBacklinks={handleAddBacklinks}
							onClose={() => onOpenChange(false)}
						/>
					</ScrollArea>
				</DialogContent>
			</Dialog>
			<ImportDialog
				open={isImportDialogOpen}
				onOpenChange={setIsImportDialogOpen}
				onFileUploaded={handleFileUploaded}
			/>
			<Toaster />
		</>
	)
}
