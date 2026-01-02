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

import {
	PipelineStageCard,
	PipelineStageCardSkeleton,
} from '@/components/pipeline/pipeline-stage-card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
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

function PipelineJobStatus({ job, isActive }: { job: ImportJob | null; isActive: boolean }) {
	if (!job || !isActive) return null

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

function ArrowSeparator() {
	return (
		<div className="flex items-center justify-center text-muted-foreground">
			<ArrowRight className="h-6 w-6" />
		</div>
	)
}

const StageUpload = ({
	uploadedFile,
	isJobRunning,
	isStage1Complete,
	onUploadOpen,
	onResetUpload,
}: {
	uploadedFile: string | null
	isJobRunning: boolean
	isStage1Complete: boolean
	onUploadOpen: () => void
	onResetUpload: () => void
}) => (
	<PipelineStageCard
		title="Stage 1: Upload File"
		description="Upload your single, large Gemini export file (.json or .xml)."
		isDisabled={false}
		status={isStage1Complete ? 'complete' : 'pending'}
	>
		<div className="flex items-center gap-2">
			<Button onClick={onUploadOpen} disabled={isJobRunning || isStage1Complete}>
				<FileUp className="mr-2 h-4 w-4" />
				{uploadedFile ? 'File Uploaded' : 'Upload File'}
			</Button>
			{isStage1Complete && (
				<Button onClick={onResetUpload} variant="outline" size="sm" disabled={isJobRunning}>
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
)

const StageSplit = ({
	isStage1Complete,
	isStage2Complete,
	isSplitting,
	isJobRunning,
	job,
	stagedFileCount,
	onSplitFile,
	onResetStaging,
}: {
	isStage1Complete: boolean
	isStage2Complete: boolean
	isSplitting: boolean
	isJobRunning: boolean
	job: ImportJob | null
	stagedFileCount: number
	onSplitFile: () => void
	onResetStaging: () => void
}) => (
	<PipelineStageCard
		title="Stage 2: Split File into Conversations"
		description="Split the large file into individual conversation files in the staging area."
		isDisabled={!isStage1Complete}
		status={isStage2Complete ? 'complete' : 'pending'}
	>
		<div className="flex items-center justify-between">
			<div className="flex items-center gap-2">
				<Button
					onClick={onSplitFile}
					disabled={isJobRunning || !isStage1Complete || isStage2Complete}
				>
					{isSplitting ? (
						<Loader className="mr-2 h-4 w-4 animate-spin" />
					) : (
						<Split className="mr-2 h-4 w-4" />
					)}
					{isSplitting ? 'Splitting...' : 'Split File'}
				</Button>
				{isStage2Complete && (
					<Button onClick={onResetStaging} variant="outline" size="sm" disabled={isJobRunning}>
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
		<PipelineJobStatus job={job} isActive={(job?.jobId ?? '').startsWith('split') && isSplitting} />
	</PipelineStageCard>
)

const StageMetadata = ({
	isStage2Complete,
	isStage3Complete,
	isProcessing,
	isJobRunning,
	job,
	processedFileCount,
	onProcessFiles,
	onResetProcessing,
}: {
	isStage2Complete: boolean
	isStage3Complete: boolean
	isProcessing: boolean
	isJobRunning: boolean
	job: ImportJob | null
	processedFileCount: number
	onProcessFiles: () => void
	onResetProcessing: () => void
}) => (
	<PipelineStageCard
		title="Stage 3: Extract Metadata (Fast Scan)"
		description="Scan each staged file and extract basic info into the database."
		isDisabled={!isStage2Complete}
		status={isStage3Complete ? 'complete' : 'pending'}
	>
		<div className="flex items-center justify-between">
			<div className="flex items-center gap-2">
				<Button
					onClick={onProcessFiles}
					disabled={isJobRunning || !isStage2Complete || isStage3Complete}
				>
					{isProcessing ? (
						<Loader className="mr-2 h-4 w-4 animate-spin" />
					) : (
						<Database className="mr-2 h-4 w-4" />
					)}
					{isProcessing ? 'Processing...' : 'Extract Metadata'}
				</Button>
				{isStage3Complete && (
					<Button onClick={onResetProcessing} variant="outline" size="sm" disabled={isJobRunning}>
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
		<PipelineJobStatus
			job={job}
			isActive={(job?.jobId ?? '').startsWith('process') && isProcessing}
		/>
	</PipelineStageCard>
)

const StageTranscripts = ({
	isStage3Complete,
	isStage4Complete,
	isFetching,
	isJobRunning,
	job,
	processedFileCount,
	fetchedTranscriptCount,
	onFetchTranscripts,
}: {
	isStage3Complete: boolean
	isStage4Complete: boolean
	isFetching: boolean
	isJobRunning: boolean
	job: ImportJob | null
	processedFileCount: number
	fetchedTranscriptCount: number
	onFetchTranscripts: () => void
}) => (
	<PipelineStageCard
		title="Stage 4: Fetch Transcripts"
		description="Fetch and save the full transcript for every conversation. This may take a while."
		isDisabled={!isStage3Complete}
		status={isStage4Complete ? 'complete' : 'pending'}
	>
		<div className="flex items-center justify-between">
			<div className="flex items-center gap-2">
				<Button
					onClick={onFetchTranscripts}
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
		<PipelineJobStatus job={job} isActive={(job?.jobId ?? '').startsWith('fetch') && isFetching} />
	</PipelineStageCard>
)

const StageBacklinks = ({
	canBacklink,
	isStage5Complete,
	isBacklinking,
	isJobRunning,
	job,
	fetchedTranscriptCount,
	backlinkedCount,
	onAddBacklinks,
}: {
	canBacklink: boolean
	isStage5Complete: boolean
	isBacklinking: boolean
	isJobRunning: boolean
	job: ImportJob | null
	fetchedTranscriptCount: number
	backlinkedCount: number
	onAddBacklinks: () => void
}) => (
	<PipelineStageCard
		title="Stage 5: Add AI Backlinks"
		description="Use AI to intelligently scan for and create [[wikilinks]] between related conversations."
		isDisabled={!canBacklink || isJobRunning}
		status={isStage5Complete ? 'complete' : 'pending'}
	>
		<div className="flex items-center justify-between">
			<div className="flex items-center gap-2">
				<Button onClick={onAddBacklinks} disabled={!canBacklink || isJobRunning}>
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
		<PipelineJobStatus
			job={job}
			isActive={(job?.jobId ?? '').startsWith('backlink') && isBacklinking}
		/>
	</PipelineStageCard>
)

const StageReview = ({
	isStage5Complete,
	onClose,
}: {
	isStage5Complete: boolean
	onClose: () => void
}) => (
	<PipelineStageCard
		title="Stage 6: Review & Process"
		description="Your conversations are fully loaded. Go to the Explorer to review, categorize, and summarize them."
		isDisabled={!isStage5Complete}
		status={isStage5Complete ? 'complete' : 'pending'}
	>
		<Link href="/explorer" onClick={onClose}>
			<Button disabled={!isStage5Complete}>
				<Eye className="mr-2 h-4 w-4" />
				Go to Explorer
			</Button>
		</Link>
	</PipelineStageCard>
)

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
				<ArrowSeparator />
				<PipelineStageCardSkeleton />
				<ArrowSeparator />
				<PipelineStageCardSkeleton />
				<ArrowSeparator />
				<PipelineStageCardSkeleton />
				<ArrowSeparator />
				<PipelineStageCardSkeleton />
			</div>
		)
	}

	const isJobRunning = isSplitting || isProcessing || isFetching || isBacklinking

	const isStage1Complete = !!uploadedFile
	const isStage2Complete = stagedFileCount > 0 && !isSplitting
	const isStage3Complete = processedFileCount > 0 && !isProcessing
	const isStage4Complete =
		fetchedTranscriptCount > 0 && fetchedTranscriptCount === processedFileCount && !isFetching
	const canBacklink = fetchedTranscriptCount > backlinkedCount
	const isStage5Complete =
		fetchedTranscriptCount > 0 && backlinkedCount === fetchedTranscriptCount && !isBacklinking

	return (
		<div className="space-y-8">
			<StageUpload
				uploadedFile={uploadedFile}
				isJobRunning={isJobRunning}
				isStage1Complete={isStage1Complete}
				onUploadOpen={onUploadOpen}
				onResetUpload={onResetUpload}
			/>

			<ArrowSeparator />

			<StageSplit
				isStage1Complete={isStage1Complete}
				isStage2Complete={isStage2Complete}
				isSplitting={isSplitting}
				isJobRunning={isJobRunning}
				job={job}
				stagedFileCount={stagedFileCount}
				onSplitFile={onSplitFile}
				onResetStaging={onResetStaging}
			/>

			<ArrowSeparator />

			<StageMetadata
				isStage2Complete={isStage2Complete}
				isStage3Complete={isStage3Complete}
				isProcessing={isProcessing}
				isJobRunning={isJobRunning}
				job={job}
				processedFileCount={processedFileCount}
				onProcessFiles={onProcessFiles}
				onResetProcessing={onResetProcessing}
			/>

			<ArrowSeparator />

			<StageTranscripts
				isStage3Complete={isStage3Complete}
				isStage4Complete={isStage4Complete}
				isFetching={isFetching}
				isJobRunning={isJobRunning}
				job={job}
				processedFileCount={processedFileCount}
				fetchedTranscriptCount={fetchedTranscriptCount}
				onFetchTranscripts={onFetchTranscripts}
			/>

			<ArrowSeparator />

			<StageBacklinks
				canBacklink={canBacklink}
				isStage5Complete={isStage5Complete}
				isBacklinking={isBacklinking}
				isJobRunning={isJobRunning}
				job={job}
				fetchedTranscriptCount={fetchedTranscriptCount}
				backlinkedCount={backlinkedCount}
				onAddBacklinks={onAddBacklinks}
			/>

			<ArrowSeparator />

			<StageReview isStage5Complete={isStage5Complete} onClose={onClose} />
		</div>
	)
}
