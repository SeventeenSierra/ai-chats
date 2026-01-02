// SPDX-License-Identifier: PolyForm-Strict-1.0.0
// SPDX-FileCopyrightText: 2025 Seventeen Sierra LLC

'use server'

/**
 * @fileOverview A flow to wipe all conversation data from database and storage.
 *
 * - wipeData - A function that deletes all conversations and stored files.
 */

import { deleteAllConversations } from '@ai-chat/backend/queries'
import { deleteFromStorage, listFromStorage } from '@ai-chat/backend/storage'
import { z } from 'zod'
import { ai } from '../core/genkit'

const WipeDataInputSchema = z.object({})
export type WipeDataInput = z.infer<typeof WipeDataInputSchema>

const WipeDataOutputSchema = z.object({
	success: z.boolean(),
	message: z.string(),
	deletedDocs: z.number(),
	deletedFiles: z.number(),
})
export type WipeDataOutput = z.infer<typeof WipeDataOutputSchema>

export async function wipeData(input: WipeDataInput): Promise<WipeDataOutput> {
	return wipeDataFlow(input)
}

// Helper function to robustly delete all items in a storage path
export async function deleteStorageDirectory(prefix: string): Promise<number> {
	let deletedCount = 0
	try {
		const files = await listFromStorage(prefix)
		for (const key of files) {
			await deleteFromStorage(key)
			deletedCount++
		}
		console.log(`Deleted ${deletedCount} file(s) from '${prefix}'.`)
	} catch (error) {
		// If the directory doesn't exist or another error occurs, log it but don't fail the whole wipe.
		console.warn('Could not fully clear directory %s:', prefix, error)
	}
	return deletedCount
}

const wipeDataFlow = ai.defineFlow(
	{
		name: 'wipeDataFlow',
		inputSchema: WipeDataInputSchema,
		outputSchema: WipeDataOutputSchema,
	},
	async () => {
		console.log('Starting data wipe flow...')
		let deletedDocs = 0
		let deletedFiles = 0

		try {
			// 1. Delete all conversations from PostgreSQL
			deletedDocs = await deleteAllConversations()
			console.log(`Deleted ${deletedDocs} conversation(s) from database.`)

			// 2. Delete all files from S3 storage
			deletedFiles += await deleteStorageDirectory('uploads/')
			deletedFiles += await deleteStorageDirectory('transcripts/')
			deletedFiles += await deleteStorageDirectory('staging/')

			return {
				success: true,
				message: `Successfully wiped ${deletedDocs} document(s) and ${deletedFiles} file(s).`,
				deletedDocs,
				deletedFiles,
			}
		} catch (error) {
			console.error('!!!!!!!!!! Failed to wipe data !!!!!!!!!!', error)
			const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.'
			return {
				success: false,
				message: `An error occurred during wipe: ${errorMessage}`,
				deletedDocs: 0,
				deletedFiles: 0,
			}
		}
	},
)
