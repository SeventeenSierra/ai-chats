// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2025 Seventeen Sierra LLC

'use client'

import {
	ArrowRight,
	Bot,
	CheckCircle,
	Database,
	FileText,
	FileUp,
	Loader,
	Server,
	Sparkles,
	Split,
	XCircle,
} from 'lucide-react'
import Link from 'next/link'

import {
	PipelineStageCard,
	PipelineStageCardSkeleton,
} from '@/components/pipeline/pipeline-stage-card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import type { ImportJob } from '@/types'

type PipelineProgressProps = {
	isLoading: boolean
	job: ImportJob | null
	uploadedFile: string | null
	stagedFileCount: number
	processedFileCount: number
	fetchedTranscriptCount: number
	backlinkedCount: number
	isSplitting: boolean
	isProcessing: boolean
	isFetching: boolean
	isBacklinking: boolean
	onUploadOpen: () => void
	onResetUpload: () => void
	onSplitFile: () => void
	onResetStaging: () => void
	onProcessFiles: () => void
	onResetProcessing: () => void
	onFetchTranscripts: () => void
	onAddBacklinks: () => void
	onClose: () => void
}

function PipelineJobStatus({
	job,
	isActive,
	label,
}: {
	job: ImportJob | null
	isActive: boolean
	label?: string
}) {
	if (!job || !isActive) return null

	const { status, progress = 0, message } = job

	return (
		<div className="mt-4 p-4 border rounded-lg bg-muted/50 space-y-2">
			<div className="flex items-center justify-between">
				<p className="font-semibold text-sm">
					{label || 'Job'} Status: <span className="font-mono text-primary">{status}</span>
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

function ArrowSeparator() {
	return (
		<div className="flex items-center justify-center text-muted-foreground opacity-50">
			<ArrowRight className="h-5 w-5" />
		</div>
	)
}

const StageIngest = ({
	uploadedFile,
	stagedFileCount,
	processedFileCount,
	fetchedTranscriptCount,
	isSplitting,
	isProcessing,
	isFetching,
	job,
	onUploadOpen,
	onSplitFile,
	onProcessFiles,
	onFetchTranscripts,
}: any) => {
	// Determine overall state
	const hasUpload = !!uploadedFile
	const hasSplit = stagedFileCount > 0
	const hasMeta = processedFileCount > 0
	const hasTranscripts = fetchedTranscriptCount > 0 && fetchedTranscriptCount === processedFileCount

	// Auto-advance logic could be here, but we'll keep manual buttons for clarity but grouped

	const isRunning = isSplitting || isProcessing || isFetching
	const currentJob = isSplitting
		? 'Splitting'
		: isProcessing
			? 'Processing'
			: isFetching
				? 'Fetching'
				: ''

	return (
		<PipelineStageCard
			title="Phase 1: System Ingestion"
			description="Standard server functions to digest data. No AI involved."
			isDisabled={false}
			status={hasTranscripts ? 'complete' : 'pending'}
			icon={<Server className="h-5 w-5" />}
		>
			<div className="space-y-4">
				{/* Visual Step Tracker */}
				<div className="grid grid-cols-4 gap-2 text-center text-xs">
					<div
						className={cn(
							'p-2 rounded border',
							hasUpload
								? 'bg-primary/10 border-primary text-primary font-medium'
								: 'text-muted-foreground',
						)}
					>
						1. Upload
					</div>
					<div
						className={cn(
							'p-2 rounded border',
							hasSplit
								? 'bg-primary/10 border-primary text-primary font-medium'
								: 'text-muted-foreground',
						)}
					>
						2. Split
					</div>
					<div
						className={cn(
							'p-2 rounded border',
							hasMeta
								? 'bg-primary/10 border-primary text-primary font-medium'
								: 'text-muted-foreground',
						)}
					>
						3. Meta
					</div>
					<div
						className={cn(
							'p-2 rounded border',
							hasTranscripts
								? 'bg-primary/10 border-primary text-primary font-medium'
								: 'text-muted-foreground',
						)}
					>
						4. Transcripts
					</div>
				</div>

				<div className="flex flex-wrap gap-2">
					{/* Action Buttons - Context aware */}
					{!hasUpload && (
						<Button onClick={onUploadOpen} size="sm">
							<FileUp className="mr-2 h-4 w-4" /> Upload Export
						</Button>
					)}
					{hasUpload && !hasSplit && (
						<Button onClick={onSplitFile} size="sm" disabled={isRunning}>
							{isSplitting ? (
								<Loader className="mr-2 h-4 w-4 animate-spin" />
							) : (
								<Split className="mr-2 h-4 w-4" />
							)}
							Split Files
						</Button>
					)}
					{hasSplit && !hasMeta && (
						<Button onClick={onProcessFiles} size="sm" disabled={isRunning}>
							{isProcessing ? (
								<Loader className="mr-2 h-4 w-4 animate-spin" />
							) : (
								<Database className="mr-2 h-4 w-4" />
							)}
							Extract Metadata
						</Button>
					)}
					{hasMeta && !hasTranscripts && (
						<Button onClick={onFetchTranscripts} size="sm" disabled={isRunning}>
							{isFetching ? (
								<Loader className="mr-2 h-4 w-4 animate-spin" />
							) : (
								<FileText className="mr-2 h-4 w-4" />
							)}
							Fetch Transcripts
						</Button>
					)}
					{hasTranscripts && (
						<div className="flex items-center text-green-600 gap-2 text-sm font-medium">
							<CheckCircle className="h-4 w-4" /> Ingestion Complete ({fetchedTranscriptCount}{' '}
							items)
						</div>
					)}
				</div>

				{isRunning && <PipelineJobStatus job={job} isActive={true} label={currentJob} />}
			</div>
		</PipelineStageCard>
	)
}

const StageEnrich = ({
	canBacklink,
	isStage5Complete,
	isBacklinking,
	job,
	fetchedTranscriptCount,
	backlinkedCount,
	onAddBacklinks,
}: any) => {
	return (
		<PipelineStageCard
			title="Phase 2: AI Enrichment"
			description="Genkit AI flows to analyze content, summarize, and link conversations."
			isDisabled={!canBacklink && backlinkedCount === 0}
			status={isStage5Complete ? 'complete' : 'pending'}
			icon={<Bot className="h-5 w-5" />}
		>
			<div className="space-y-4">
				<div className="flex flex-col gap-2">
					<p className="text-sm text-muted-foreground">
						AI processes are computationally intensive and may take time.
					</p>

					<div className="flex items-center gap-4 border p-3 rounded-md bg-muted/20">
						<div className="flex-1">
							<h4 className="font-medium text-sm flex items-center gap-2">
								<Sparkles className="h-4 w-4 text-purple-500" />
								Semantic Backlinking
							</h4>
							<p className="text-xs text-muted-foreground mt-1">
								{backlinkedCount} / {fetchedTranscriptCount} linked
							</p>
						</div>
						<Button
							onClick={onAddBacklinks}
							disabled={!canBacklink || isBacklinking}
							size="sm"
							variant={isStage5Complete ? 'outline' : 'default'}
						>
							{isBacklinking ? (
								<Loader className="mr-2 h-4 w-4 animate-spin" />
							) : isStage5Complete ? (
								'Re-run'
							) : (
								'Start'
							)}
						</Button>
					</div>
				</div>

				{isBacklinking && <PipelineJobStatus job={job} isActive={true} label="AI Backlinking" />}
			</div>
		</PipelineStageCard>
	)
}

export function PipelineProgress({
	isLoading,
	job,
	uploadedFile,
	stagedFileCount,
	processedFileCount,
	fetchedTranscriptCount,
	backlinkedCount,
	isSplitting,
	isProcessing,
	isFetching,
	isBacklinking,
	onUploadOpen,
	onResetUpload,
	onSplitFile,
	onResetStaging,
	onProcessFiles,
	onResetProcessing,
	onFetchTranscripts,
	onAddBacklinks,
	onClose,
}: PipelineProgressProps) {
	if (isLoading) {
		return (
			<div className="space-y-8">
				<PipelineStageCardSkeleton />
				<PipelineStageCardSkeleton />
			</div>
		)
	}

	return (
		<div className="space-y-6">
			<StageIngest
				uploadedFile={uploadedFile}
				stagedFileCount={stagedFileCount}
				processedFileCount={processedFileCount}
				fetchedTranscriptCount={fetchedTranscriptCount}
				isSplitting={isSplitting}
				isProcessing={isProcessing}
				isFetching={isFetching}
				job={job}
				onUploadOpen={onUploadOpen}
				onSplitFile={onSplitFile}
				onProcessFiles={onProcessFiles}
				onFetchTranscripts={onFetchTranscripts}
			/>

			<ArrowSeparator />

			<StageEnrich
				canBacklink={fetchedTranscriptCount > 0}
				isStage5Complete={
					fetchedTranscriptCount > 0 && backlinkedCount >= fetchedTranscriptCount && !isBacklinking
				}
				isBacklinking={isBacklinking}
				job={job}
				fetchedTranscriptCount={fetchedTranscriptCount}
				backlinkedCount={backlinkedCount}
				onAddBacklinks={onAddBacklinks}
			/>

			<div className="flex justify-end pt-4">
				<Link
					href="/explorer"
					onClick={onClose}
					className={cn(fetchedTranscriptCount > 0 ? '' : 'pointer-events-none opacity-50')}
				>
					<Button variant="ghost">
						Close & View Data <ArrowRight className="ml-2 h-4 w-4" />
					</Button>
				</Link>
			</div>
		</div>
	)
}
