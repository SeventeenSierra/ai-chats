// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2025 Seventeen Sierra LLC

'use server'

import {
	addBacklinksToTranscripts,
	categorizeSingleConversation,
	checkForExistingUploads,
	deleteStagedConversations,
	deleteStagedFiles,
	deleteUploadedFile,
	exportAllToZip,
	exportToMarkdown,
	fetchAndSaveTranscripts,
	getTranscript,
	processConversations,
	splitImportedFile,
	summarizeConversation,
	updateConversation,
	updateImportStatus,
	wipeData,
} from '@ai-chat/ai'
import {
	addCategory,
	getConversations,
	renameCategory,
	updateConversationCategory,
} from '@ai-chat/backend'
import type { Conversation, ConversationTurn } from '@/types'

export async function getSummaryAction(
	conversationId: string,
	transcript: string,
): Promise<{ summary?: string; error?: string }> {
	try {
		const result = await summarizeConversation({ transcript })
		// Also update the summarizedAt timestamp
		await updateConversation({
			id: conversationId,
			summary: result.summary,
			summarizedAt: new Date().toISOString(),
		})
		return { summary: result.summary }
	} catch (error) {
		console.error('Summarization error:', error)
		const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.'
		return { error: `Failed to generate summary: ${errorMessage}` }
	}
}

export async function getTranscriptAction(
	storageFilename: string,
): Promise<{ transcript?: ConversationTurn[]; error?: string }> {
	if (!storageFilename) {
		return { error: 'No storage filename provided to fetch transcript.' }
	}
	try {
		const result = await getTranscript({ storageFilename })
		return { transcript: result.transcript }
	} catch (error) {
		console.error('Get transcript error:', error)
		const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.'
		return { error: `Failed to get transcript: ${errorMessage}` }
	}
}

/**
 * Enrich a single conversation by fetching and saving its transcript.
 */
export async function enrichSingleConversationAction(
	conversationId: string,
	storageFilename: string,
): Promise<{ success: boolean; transcript?: ConversationTurn[]; error?: string }> {
	if (!storageFilename) {
		return { success: false, error: 'No storage filename provided to fetch transcript.' }
	}
	try {
		const result = await getTranscript({ storageFilename })
		if (result.transcript) {
			await updateConversation({
				id: conversationId,
				transcript: result.transcript,
			})
			return { success: true, transcript: result.transcript }
		}
		return { success: false, error: 'No transcript returned.' }
	} catch (error) {
		console.error('Enrich single conversation error:', error)
		const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.'
		return { success: false, error: `Failed to enrich transcript: ${errorMessage}` }
	}
}

export async function splitFileAction(
	filename: string,
	jobId: string,
): Promise<{ success: boolean; message: string; fileCount?: number }> {
	try {
		const result = await splitImportedFile({ filename, jobId })
		if (!result.success) {
			throw new Error(result.message)
		}
		return { success: true, message: 'File splitting complete.', fileCount: result.fileCount }
	} catch (error) {
		console.error('Split file error:', error)
		return {
			success: false,
			message: error instanceof Error ? error.message : 'Failed to split file.',
		}
	}
}

export async function processConversationsAction(
	jobId: string,
): Promise<{ success: boolean; message: string }> {
	try {
		const result = await processConversations({ jobId })
		if (!result.success) {
			throw new Error(result.message)
		}
		return { success: true, message: 'Conversation processing complete.' }
	} catch (error) {
		console.error('Process conversations error:', error)
		return {
			success: false,
			message: error instanceof Error ? error.message : 'Failed to process conversations.',
		}
	}
}

export async function fetchTranscriptsAction(
	jobId: string,
): Promise<{ success: boolean; message: string }> {
	try {
		await fetchAndSaveTranscripts({ jobId })
		return { success: true, message: 'Transcript fetching complete.' }
	} catch (error) {
		console.error('Fetch transcripts error:', error)
		return {
			success: false,
			message: error instanceof Error ? error.message : 'Failed to fetch transcripts.',
		}
	}
}

export async function addBacklinksAction(
	jobId: string,
): Promise<{ success: boolean; message: string }> {
	try {
		await addBacklinksToTranscripts({ jobId })
		return { success: true, message: 'Transcript backlinking complete.' }
	} catch (error) {
		console.error('Add backlinks error:', error)
		return {
			success: false,
			message: error instanceof Error ? error.message : 'Failed to add backlinks.',
		}
	}
}

export async function wipeDataAction(): Promise<{
	success: boolean
	message: string
}> {
	try {
		const result = await wipeData({})
		return { success: result.success, message: result.message }
	} catch (error) {
		console.error('Wipe data error:', error)
		const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.'
		return {
			success: false,
			message: `Failed to wipe data: ${errorMessage}`,
		}
	}
}

import { runWithConcurrency } from '@ai-chat/shared'

/**
 * New, more robust grouping action that processes conversations one by one.
 */
export async function groupConversationsAction(
	conversationsToProcess: Conversation[],
): Promise<{ success: boolean; error?: string }> {
	let existingCategories: string[] = []
	try {
		const allConversations = await getConversations()
		existingCategories = [
			...new Set(allConversations.map((c) => c.category).filter(Boolean) as string[]),
		]
	} catch (error) {
		// Non-fatal, we can proceed without existing categories
		console.error('Could not pre-fetch existing categories', error)
	}

	// Limit concurrency to 1 to prevent local AI overload
	const processingTasks = conversationsToProcess.map((convo) => async () => {
		try {
			const { category } = await categorizeSingleConversation({
				conversation: {
					id: convo.id,
					title: convo.title,
					summary: convo.summary,
				},
				existingCategories: existingCategories,
			})

			if (category) {
				await updateConversationCategory(convo.id, category)
				if (!existingCategories.includes(category)) {
					existingCategories.push(category)
				}
			}
		} catch (error) {
			console.error('Failed to categorize conversation %s: "%s"', convo.id, convo.title, error)
			// We can choose to continue or stop on error. For robustness, we'll continue.
		}
	})

	await runWithConcurrency(processingTasks, 1)
	return { success: true }
}

export async function cancelImportAction(jobId: string): Promise<{ success: boolean }> {
	try {
		await updateImportStatus({ jobId, status: 'cancelled', message: 'Import cancelled by user.' })
		return { success: true }
	} catch (error) {
		console.error('Failed to cancel job %s', jobId, error)
		return { success: false }
	}
}

export async function checkForExistingUploadsAction(): Promise<{ filename: string | null }> {
	try {
		const result = await checkForExistingUploads({})
		return result
	} catch (error) {
		console.error('Check for existing uploads error:', error)
		return { filename: null }
	}
}

export async function deleteUploadedFileAction(filename: string): Promise<{ success: boolean }> {
	try {
		const result = await deleteUploadedFile({ filename })
		return { success: result.success }
	} catch (error) {
		console.error('Delete uploaded file error:', error)
		return { success: false }
	}
}

export async function deleteStagedFilesAction(): Promise<{
	success: boolean
	deletedCount: number
}> {
	try {
		const result = await deleteStagedFiles({})
		return { success: result.success, deletedCount: result.deletedCount }
	} catch (error) {
		console.error('Delete staged files error:', error)
		return { success: false, deletedCount: 0 }
	}
}

export async function deleteStagedConversationsAction(): Promise<{
	success: boolean
	deletedCount: number
}> {
	try {
		const result = await deleteStagedConversations({})
		return { success: result.success, deletedCount: result.deletedCount }
	} catch (error) {
		console.error('Delete staged conversations error:', error)
		return { success: false, deletedCount: 0 }
	}
}

export async function updateConversationCategoryAction(
	conversationId: string,
	newCategory: string,
): Promise<{ success: boolean }> {
	try {
		await updateConversationCategory(conversationId, newCategory)
		return { success: true }
	} catch (error) {
		console.error('Update conversation category error:', error)
		return { success: false }
	}
}

export async function addCategoryAction(
	categoryName: string,
): Promise<{ success: boolean; error?: string }> {
	try {
		await addCategory(categoryName)
		return { success: true }
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.'
		console.error('Add category error:', error)
		return { success: false, error: errorMessage }
	}
}

export async function renameCategoryAction(
	oldName: string,
	newName: string,
): Promise<{ success: boolean; error?: string }> {
	try {
		await renameCategory(oldName, newName)
		return { success: true }
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.'
		console.error('Rename category error:', error)
		return { success: false, error: errorMessage }
	}
}

export async function exportToMarkdownAction(
	conversation: Conversation,
): Promise<{ markdownContent?: string; error?: string }> {
	if (!conversation.transcript) {
		return { error: 'Cannot export a conversation without a transcript.' }
	}
	try {
		const result = await exportToMarkdown({
			title: conversation.title,
			createdAt: conversation.createdAt,
			category: conversation.category,
			transcript: conversation.transcript,
		})
		return { markdownContent: result.markdownContent }
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.'
		console.error('Export to markdown error:', error)
		return { error: `Failed to export: ${errorMessage}` }
	}
}

export async function archiveConversationAction(
	conversationId: string,
	archive: boolean,
): Promise<{ success: boolean }> {
	try {
		const status = archive ? 'archived' : 'processed'
		await updateConversation({ id: conversationId, status })
		return { success: true }
	} catch (error) {
		console.error('Archive conversation error:', error)
		return { success: false }
	}
}

export async function downloadAllAction(): Promise<{
	zipContent?: string
	fileCount?: number
	error?: string
}> {
	try {
		const result = await exportAllToZip({})
		return { zipContent: result.zipContent, fileCount: result.fileCount }
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.'
		console.error('Download all error:', error)
		return { error: `Failed to create zip file: ${errorMessage}` }
	}
}

// New actions for S3/PostgreSQL-based Pipeline

import { getImportJobStatus } from '@ai-chat/ai'
import { listFromStorage } from '@ai-chat/backend'

export async function getImportJobStatusAction(jobId: string): Promise<{
	jobId: string
	status: string
	filename?: string | null
	message?: string | null
	total?: number
	processed?: number
	progress?: number
} | null> {
	try {
		const result = await getImportJobStatus(jobId)
		return result
	} catch (error) {
		console.error('Get import job status error:', error)
		return null
	}
}

export async function listStagedFilesAction(): Promise<string[]> {
	try {
		const files = await listFromStorage('staging/')
		return files
	} catch (error) {
		console.error('List staged files error:', error)
		return []
	}
}

export async function getConversationsAction(): Promise<
	Array<{
		id: string
		title: string
		transcript?: unknown
		backlinkedAt?: string | null
	}>
> {
	try {
		const conversations = await getConversations()
		return conversations
	} catch (error) {
		console.error('Get conversations error:', error)
		return []
	}
}

import { getConversationById } from '@ai-chat/backend/queries'

export async function getConversationByIdAction(
	id: string,
): Promise<{ conversation?: Conversation | null; error?: string }> {
	try {
		const conversation = await getConversationById(id)
		return { conversation }
	} catch (error) {
		console.error('Get conversation by ID error:', error)
		return { error: 'Failed to fetch conversation details.' }
	}
}
