// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2025 Seventeen Sierra LLC

'use client'

import {
	ArrowRight,
	CheckCircle,
	Database,
	Eye,
	FileText,
	FileUp,
	Loader,
	RotateCcw,
	Sparkles,
	Split,
	XCircle,
} from 'lucide-react'
import Link from 'next/link'
import * as React from 'react'
import { ImportDialog } from '@/components/conversations/import-dialog'
import {
	PipelineStageCard,
	PipelineStageCardSkeleton,
} from '@/components/pipeline/pipeline-stage-card'
import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
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

	const isJobRunning = isSplitting || isProcessing || isFetching || isBacklinking
	const isStage1Complete = !!uploadedFile
	const isStage2Complete = stagedFileCount > 0 && !isSplitting
	const isStage3Complete = processedFileCount > 0 && !isProcessing

	// Stage 4 is "complete" for the UI if all processed files have had their transcripts fetched.
	const isStage4Complete =
		fetchedTranscriptCount > 0 && fetchedTranscriptCount === processedFileCount && !isFetching

	// Backlinking is available as long as there is at least one fetched transcript that has not been backlinked.
	const canBacklink = fetchedTranscriptCount > backlinkedCount

	// Stage 5 is "complete" if all fetched transcripts have been backlinked.
	const isStage5Complete =
		fetchedTranscriptCount > 0 && backlinkedCount === fetchedTranscriptCount && !isBacklinking

	const renderJobStatus = (jobType: string) => {
		if (!job || !job.jobId.startsWith(jobType)) return null

		const isActive =
			(job.jobId.startsWith('split') && isSplitting) ||
			(job.jobId.startsWith('process') && isProcessing) ||
			(job.jobId.startsWith('fetch') && isFetching) ||
			(job.jobId.startsWith('backlink') && isBacklinking)

		if (!isActive) return null

		const { status, progress = 0, message } = job

		return (
			<div className="mt-4 p-4 border rounded-lg bg-muted/50 space-y-2">
				<div className="flex items-center justify-between">
					<p className="font-semibold text-sm">
						Job Status: <span className="font-mono text-primary">{status}</span>
					</p>
					{(status === 'failed' || status === 'cancelled') && (
						<XCircle className="h-5 w-5 text-red-500" />
					)}
					{status === 'completed' && <CheckCircle className="h-5 w-5 text-green-500" />}
				</div>
				<Progress value={progress} className="my-2" />
				<p className="text-xs text-muted-foreground">{message}</p>
			</div>
		)
	}

	const renderArrow = () => (
		<div className="flex items-center justify-center text-muted-foreground">
			<ArrowRight className="h-6 w-6" />
		</div>
	)

	const renderContent = () => {
		if (isCheckingPipeline) {
			return (
				<div className="space-y-8">
					<PipelineStageCardSkeleton />
					{renderArrow()}
					<PipelineStageCardSkeleton />
					{renderArrow()}
					<PipelineStageCardSkeleton />
					{renderArrow()}
					<PipelineStageCardSkeleton />
					{renderArrow()}
					<PipelineStageCardSkeleton />
				</div>
			)
		}

		return (
			<div className="space-y-8">
				<PipelineStageCard
					title="Stage 1: Upload File"
					description="Upload your single, large Gemini export file (.json or .xml)."
					status={isStage1Complete ? 'complete' : 'pending'}
				>
					<div className="flex items-center gap-2">
						<Button
							onClick={() => setIsImportDialogOpen(true)}
							disabled={isJobRunning || isStage1Complete}
						>
							<FileUp className="mr-2 h-4 w-4" />
							{uploadedFile ? 'File Uploaded' : 'Upload File'}
						</Button>
						{isStage1Complete && (
							<Button
								onClick={handleResetUpload}
								variant="outline"
								size="sm"
								disabled={isJobRunning}
							>
								<RotateCcw className="mr-2 h-4 w-4" /> Reset
							</Button>
						)}
					</div>
					{uploadedFile && (
						<div className="mt-4 flex items-center gap-2 text-sm text-green-600">
							<CheckCircle className="h-5 w-5" />
							<span>
								File <span className="font-mono">{uploadedFile}</span> is ready.
							</span>
						</div>
					)}
				</PipelineStageCard>
				{renderArrow()}

				<PipelineStageCard
					title="Stage 2: Split File into Conversations"
					description="Split the large file into individual conversation files in the staging area."
					status={isStage2Complete ? 'complete' : 'pending'}
					isDisabled={!isStage1Complete}
				>
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							<Button
								onClick={handleSplitFile}
								disabled={isJobRunning || !isStage1Complete || isStage2Complete}
							>
								{isSplitting ? (
									<Loader className="mr-2 h-4 w-4 animate-spin" />
								) : (
									<Split className="mr-2 h-4 w-4" />
								)}
								{isSplitting ? 'Splitting...' : `Split File`}
							</Button>
							{isStage2Complete && (
								<Button
									onClick={handleResetStaging}
									variant="outline"
									size="sm"
									disabled={isJobRunning}
								>
									<RotateCcw className="mr-2 h-4 w-4" /> Reset
								</Button>
							)}
						</div>
						<div className="text-right">
							<p className="text-sm font-semibold text-muted-foreground">Files Created</p>
							<p className="text-2xl font-bold text-primary">
								{isSplitting ? job?.processed || 0 : stagedFileCount}
							</p>
						</div>
					</div>
					{renderJobStatus('split')}
				</PipelineStageCard>
				{renderArrow()}

				<PipelineStageCard
					title="Stage 3: Extract Metadata (Fast Scan)"
					description="Scan each staged file and extract basic info into the database."
					status={isStage3Complete ? 'complete' : 'pending'}
					isDisabled={!isStage2Complete}
				>
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							<Button
								onClick={handleProcessFiles}
								disabled={isJobRunning || !isStage2Complete || isStage3Complete}
							>
								{isProcessing ? (
									<Loader className="mr-2 h-4 w-4 animate-spin" />
								) : (
									<Database className="mr-2 h-4 w-4" />
								)}
								{isProcessing ? 'Processing...' : `Extract Metadata`}
							</Button>
							{isStage3Complete && (
								<Button
									onClick={handleResetProcessing}
									variant="outline"
									size="sm"
									disabled={isJobRunning}
								>
									<RotateCcw className="mr-2 h-4 w-4" /> Reset
								</Button>
							)}
						</div>
						<div className="text-right">
							<p className="text-sm font-semibold text-muted-foreground">Conversations Extracted</p>
							<p className="text-2xl font-bold text-primary">
								{isProcessing ? job?.processed || 0 : processedFileCount}
							</p>
						</div>
					</div>
					{renderJobStatus('process')}
				</PipelineStageCard>
				{renderArrow()}

				<PipelineStageCard
					title="Stage 4: Fetch Transcripts"
					description="Fetch and save the full transcript for every conversation. This may take a while."
					status={isStage4Complete ? 'complete' : 'pending'}
					isDisabled={!isStage3Complete}
				>
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							<Button
								onClick={handleFetchTranscripts}
								disabled={isJobRunning || !isStage3Complete || isStage4Complete}
							>
								{isFetching ? (
									<Loader className="mr-2 h-4 w-4 animate-spin" />
								) : (
									<FileText className="mr-2 h-4 w-4" />
								)}
								{isFetching ? 'Fetching...' : 'Fetch All Transcripts'}
							</Button>
						</div>
						<div className="flex gap-4">
							<div className="text-right">
								<p className="text-sm font-semibold text-muted-foreground">Total</p>
								<p className="text-2xl font-bold text-primary">{processedFileCount}</p>
							</div>
							<div className="text-right">
								<p className="text-sm font-semibold text-muted-foreground">Fetched</p>
								<p className="text-2xl font-bold text-primary">
									{isFetching ? job?.processed || 0 : fetchedTranscriptCount}
								</p>
							</div>
						</div>
					</div>
					{renderJobStatus('fetch')}
				</PipelineStageCard>
				{renderArrow()}

				<PipelineStageCard
					title="Stage 5: Add AI Backlinks"
					description="Use AI to intelligently scan for and create [[wikilinks]] between related conversations."
					status={isStage5Complete ? 'complete' : 'pending'}
					isDisabled={!canBacklink || isJobRunning}
				>
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							<Button onClick={handleAddBacklinks} disabled={!canBacklink || isJobRunning}>
								{isBacklinking ? (
									<Loader className="mr-2 h-4 w-4 animate-spin" />
								) : (
									<Sparkles className="mr-2 h-4 w-4" />
								)}
								{isBacklinking ? 'Backlinking...' : 'Add All Backlinks'}
							</Button>
						</div>
						<div className="flex gap-4">
							<div className="text-right">
								<p className="text-sm font-semibold text-muted-foreground">Total Fetched</p>
								<p className="text-2xl font-bold text-primary">{fetchedTranscriptCount}</p>
							</div>
							<div className="text-right">
								<p className="text-sm font-semibold text-muted-foreground">Linked</p>
								<p className="text-2xl font-bold text-primary">
									{isBacklinking ? job?.processed || 0 : backlinkedCount}
								</p>
							</div>
						</div>
					</div>
					{renderJobStatus('backlink')}
				</PipelineStageCard>
				{renderArrow()}

				<PipelineStageCard
					title="Stage 6: Review & Process"
					description="Your conversations are fully loaded. Go to the Explorer to review, categorize, and summarize them."
					status={isStage5Complete ? 'complete' : 'pending'}
					isDisabled={!isStage5Complete}
				>
					<Link href="/explorer" onClick={() => onOpenChange(false)}>
						<Button disabled={!isStage5Complete}>
							<Eye className="mr-2 h-4 w-4" />
							Go to Explorer
						</Button>
					</Link>
				</PipelineStageCard>
			</div>
		)
	}

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
					<ScrollArea className="max-h-[70vh] p-4">{renderContent()}</ScrollArea>
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
