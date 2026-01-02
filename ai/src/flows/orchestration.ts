// SPDX-License-Identifier: PolyForm-Strict-1.0.0
// SPDX-FileCopyrightText: 2025 Seventeen Sierra LLC

import {
	getConversations,
	getConversationsToBacklink,
	getConversationsToFetch,
} from '@ai-chat/backend'
import { enrichTranscript } from './enrich-transcripts'
import { getTranscript } from './get-transcript'
import { updateConversation } from './update-conversation'
import { updateImportStatus } from './update-import-status'

export async function fetchAndSaveTranscripts({ jobId }: { jobId: string }) {
	try {
		const conversationsToFetch = await getConversationsToFetch()
		const totalToProcess = conversationsToFetch.length

		if (totalToProcess === 0) {
			await updateImportStatus({
				jobId,
				status: 'completed',
				message: 'No new transcripts to fetch.',
			})
			return
		}

		await updateImportStatus({
			jobId,
			status: 'processing',
			total: totalToProcess,
			processed: 0,
			progress: 0,
			message: `Found ${totalToProcess} transcripts to fetch.`,
		})

		for (const [index, convo] of conversationsToFetch.entries()) {
			try {
				if (!convo.storageFilename) {
					console.warn(
						`Skipping conversation ${convo.id} because it is missing a storage filename.`,
					)
					continue
				}

				const { transcript } = await getTranscript({ storageFilename: convo.storageFilename })
				if (!transcript) {
					throw new Error(`Failed to fetch transcript for ${convo.id}`)
				}

				await updateConversation({
					id: convo.id,
					transcript: transcript,
				})

				await updateImportStatus({
					jobId,
					status: 'processing',
					processed: index + 1,
					total: totalToProcess,
					progress: Math.round(((index + 1) / totalToProcess) * 100),
					message: `Fetched transcript ${index + 1} of ${totalToProcess}...`,
				})
			} catch (fetchError) {
				console.error('Error fetching transcript for conversation %s:', convo.id, fetchError)
			}
		}
		await updateImportStatus({
			jobId,
			status: 'completed',
			message: `Successfully fetched ${totalToProcess} transcripts.`,
		})
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.'
		await updateImportStatus({
			jobId,
			status: 'failed',
			message: `Fetching failed: ${errorMessage}`,
		})
	}
}

export async function addBacklinksToTranscripts({ jobId }: { jobId: string }) {
	try {
		const allConversationsForContext = await getConversations()
		const allTitles = allConversationsForContext.map((c) => c.title)

		const candidates = await getConversationsToBacklink()
		const conversationsToBacklink = candidates.filter((c) => !c.backlinkedAt)

		const totalToProcess = conversationsToBacklink.length

		if (totalToProcess === 0) {
			await updateImportStatus({
				jobId,
				status: 'completed',
				message: 'No new conversations to backlink.',
			})
			return
		}

		await updateImportStatus({
			jobId,
			status: 'enriching',
			total: totalToProcess,
			processed: 0,
			progress: 0,
			message: `Found ${totalToProcess} conversations to backlink.`,
		})

		for (const [index, convo] of conversationsToBacklink.entries()) {
			try {
				if (!convo.transcript) {
					console.warn(`Skipping backlinking for ${convo.id} due to missing transcript.`)
					continue
				}

				const { enrichedTranscript } = await enrichTranscript({
					transcript: convo.transcript as any,
					allTitles: allTitles.filter((t) => t !== convo.title),
					currentTitle: convo.title,
				})

				await updateConversation({
					id: convo.id,
					transcript: enrichedTranscript,
					backlinkedAt: new Date().toISOString(),
				})

				await updateImportStatus({
					jobId,
					status: 'enriching',
					processed: index + 1,
					total: totalToProcess,
					progress: Math.round(((index + 1) / totalToProcess) * 100),
					message: `Backlinked conversation ${index + 1} of ${totalToProcess}...`,
				})
			} catch (enrichError) {
				console.error('Error backlinking conversation %s:', convo.id, enrichError)
			}
		}

		await updateImportStatus({
			jobId,
			status: 'completed',
			message: `Successfully backlinked ${totalToProcess} conversations.`,
		})
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.'
		await updateImportStatus({
			jobId,
			status: 'failed',
			message: `Backlinking failed: ${errorMessage}`,
		})
	}
}
