// SPDX-License-Identifier: PolyForm-Strict-1.0.0
// SPDX-FileCopyrightText: 2025 Seventeen Sierra LLC

'use server'

/**
 * @fileOverview A flow that splits an uploaded file and saves the chunks to a staging directory.
 */

import { downloadFromStorage, uploadToStorage } from '@ai-chat/backend/storage'
import { splitConversationsXml } from '@ai-chat/backend/xml-parser'
import { z } from 'zod'
import { getImportJobStatus, updateImportStatus } from './update-import-status'

const SplitImportedFileInputSchema = z.object({
	filename: z.string().describe('The name of the file in the uploads/ directory to process.'),
	jobId: z.string().describe('The unique ID for this import job.'),
})
export type SplitImportedFileInput = z.infer<typeof SplitImportedFileInputSchema>

const SplitImportedFileOutputSchema = z.object({
	success: z.boolean(),
	message: z.string(),
	fileCount: z.number(),
})
export type SplitImportedFileOutput = z.infer<typeof SplitImportedFileOutputSchema>

export async function splitImportedFile(
	input: SplitImportedFileInput,
): Promise<SplitImportedFileOutput> {
	// Await the flow to ensure it completes before returning (Synchronous for Quick Import)
	return await splitImportedFileFlow(input)
}

/**
 * Defines the flow for splitting the imported file. It performs the following steps:
 * 1. Creates an initial job tracking record in PostgreSQL.
 * 2. Reads the large uploaded file from S3 Storage.
 * 3. Splits the file into individual conversation XML strings.
 * 4. Updates the job status with the total number of conversations found.
 * 5. Loops through each conversation XML and uploads it as a separate file to a 'staging/' directory.
 * 6. Updates the job progress after each file upload.
 * 7. Marks the job as 'completed' upon success.
 */
const splitImportedFileFlow = async ({ filename, jobId }: SplitImportedFileInput) => {
	try {
		await updateImportStatus({
			jobId,
			status: 'starting',
			message: 'Job created. Reading file...',
			filename,
		})

		// Read file from S3 storage
		const xmlString = (await downloadFromStorage(`uploads/${filename}`)).toString('utf-8')

		console.log(`[Job ${jobId}] Starting file split for: ${filename}`)

		const conversationXmls = splitConversationsXml(xmlString)
		const fileCount = conversationXmls.length

		console.log(`[Job ${jobId}] Split file into ${fileCount} conversations.`)

		if (fileCount === 0) {
			await updateImportStatus({
				jobId,
				status: 'failed',
				message: 'No conversations found in the file.',
			})
			return { success: false, message: 'No conversations found.', fileCount: 0 }
		}

		await updateImportStatus({
			jobId,
			status: 'splitting',
			message: 'Splitting complete. Uploading individual files...',
			total: fileCount,
			processed: 0,
			progress: 0,
		})

		for (const [index, convXml] of conversationXmls.entries()) {
			// Check if job was cancelled
			const currentStatus = await getImportJobStatus(jobId)
			if (currentStatus?.status === 'cancelled') {
				console.log(`Job ${jobId} cancelled. Stopping upload.`)
				return { success: false, message: 'Import was cancelled.', fileCount: index }
			}

			const convId = `conversation_${index + 1}.xml`
			await uploadToStorage(`staging/${convId}`, Buffer.from(convXml), 'application/xml')

			const progress = Math.round(((index + 1) / fileCount) * 100)
			await updateImportStatus({
				jobId,
				status: 'splitting',
				message: `Uploading file ${index + 1} of ${fileCount}...`,
				total: fileCount,
				processed: index + 1,
				progress,
			})
		}

		const finalMessage = `Successfully uploaded ${fileCount} files to staging/ directory.`
		console.log(`[Job ${jobId}] ${finalMessage}`)
		await updateImportStatus({
			jobId,
			status: 'completed',
			message: finalMessage,
			total: fileCount,
			processed: fileCount,
			progress: 100,
		})

		return {
			success: true,
			message: finalMessage,
			fileCount,
		}
	} catch (error) {
		console.error('!!!!!!!!!! [Job %s] Failed to split file %s !!!!!!!!!!', jobId, filename, error)
		const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.'
		await updateImportStatus({
			jobId,
			status: 'failed',
			message: `Splitting failed: ${errorMessage}`,
		})
		return {
			success: false,
			message: `An error occurred: ${errorMessage}`,
			fileCount: 0,
		}
	}
}
