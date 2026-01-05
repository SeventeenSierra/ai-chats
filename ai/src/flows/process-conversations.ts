// SPDX-License-Identifier: PolyForm-Strict-1.0.0
// SPDX-FileCopyrightText: 2025 Seventeen Sierra LLC

'use server'

/**
 * @fileOverview A flow that processes all staged files and extracts metadata.
 */

import { saveConversation } from '@ai-chat/backend/queries'
import { downloadFromStorage, listFromStorage } from '@ai-chat/backend/storage'
import { z } from 'zod'
import { analyzeAndExtractConversation } from './analyze-and-extract-conversation'
import { getImportJobStatus, updateImportStatus } from './update-import-status'

const ProcessConversationsInputSchema = z.object({
	jobId: z.string().describe('The unique ID for this import job.'),
})
export type ProcessConversationsInput = z.infer<typeof ProcessConversationsInputSchema>

const ProcessConversationsOutputSchema = z.object({
	success: z.boolean(),
	message: z.string(),
	processedCount: z.number(),
})
export type ProcessConversationsOutput = z.infer<typeof ProcessConversationsOutputSchema>

export async function processConversations(
	input: ProcessConversationsInput,
): Promise<ProcessConversationsOutput> {
	// Await the flow to ensure it completes before returning (Synchronous for Quick Import)
	return await processConversationsFlow(input)
}

/**
 * Defines the flow for processing staged conversations. It performs the following steps:
 * 1. Lists all files in the 'staging/' directory.
 * 2. Updates the job status with the total number of files to process.
 * 3. Loops through each staged file:
 *    a. Reads the file content from Storage.
 *    b. Extracts metadata (title, first prompt, etc.).
 *    c. Saves ONLY the extracted metadata to a new document in the 'conversations' table.
 *    d. Updates the job progress after each file is processed.
 * 4. Marks the job as 'completed' upon success.
 */
const processConversationsFlow = async (
	input: ProcessConversationsInput,
): Promise<ProcessConversationsOutput> => {
	const { jobId } = input
	try {
		// List all files in staging directory
		const stagedFiles = await listFromStorage('staging/')
		const fileCount = stagedFiles.length

		console.log(`[Job ${jobId}] Found ${fileCount} staged files to process.`)

		if (fileCount === 0) {
			await updateImportStatus({
				jobId,
				status: 'completed',
				message: 'No staged files to process.',
			})
			return { success: true, message: 'No staged files to process.', processedCount: 0 }
		}

		await updateImportStatus({
			jobId,
			status: 'processing',
			message: `Found ${fileCount} files. Starting metadata extraction...`,
			total: fileCount,
			processed: 0,
			progress: 0,
		})

		let processedCount = 0

		for (const [index, filePath] of stagedFiles.entries()) {
			// Check if job was cancelled
			const jobStatus = await getImportJobStatus(jobId)
			if (jobStatus?.status === 'cancelled') {
				console.log(`Job ${jobId} cancelled. Stopping processing.`)
				return { success: false, message: 'Import was cancelled.', processedCount }
			}

			try {
				// Extract filename from path (e.g., 'staging/filename.xml' -> 'filename.xml')
				const filename = filePath.replace('staging/', '')

				// Download file content from storage
				const xmlContent = (await downloadFromStorage(filePath)).toString('utf-8')

				const extractedData = await analyzeAndExtractConversation({ xmlContent })

				// Save to PostgreSQL with storage filename
				await saveConversation({
					...extractedData,
					storageFilename: filename,
				})

				if (extractedData.status !== 'quarantined') {
					processedCount++
				}
			} catch (fileError) {
				console.error('[Job %s] Error processing file %s:', jobId, filePath, fileError)
				// Continue processing other files
			}

			const progress = Math.round(((index + 1) / fileCount) * 100)
			const message = `Extracting metadata from conversation ${index + 1} of ${fileCount}...`
			await updateImportStatus({
				jobId,
				status: 'processing',
				message,
				total: fileCount,
				processed: index + 1,
				progress,
			})
		}

		const finalMessage = `Successfully processed ${processedCount} conversation(s).`
		await updateImportStatus({
			jobId,
			status: 'completed',
			message: finalMessage,
			total: fileCount,
			processed: processedCount,
			progress: 100,
		})

		return {
			success: true,
			message: finalMessage,
			processedCount,
		}
	} catch (error) {
		console.error('!!!!!!!!!! [Job %s] Failed to process staged files !!!!!!!!!!', jobId, error)
		const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.'
		await updateImportStatus({
			jobId,
			status: 'failed',
			message: `Processing failed: ${errorMessage}`,
		})
		return {
			success: false,
			message: `An error occurred: ${errorMessage}`,
			processedCount: 0,
		}
	}
}
