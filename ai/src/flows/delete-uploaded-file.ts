// SPDX-License-Identifier: PolyForm-Strict-1.0.0
// SPDX-FileCopyrightText: 2025 Seventeen Sierra LLC

'use server'

/**
 * @fileOverview A flow to delete a specific file from the 'uploads' directory.
 * This corresponds to the 'undo' action for Stage 1a of the pipeline.
 */

import { deleteFromStorage } from '@ai-chat/backend/storage'
import { z } from 'zod'

const DeleteUploadedFileInputSchema = z.object({
	filename: z.string(),
})
export type DeleteUploadedFileInput = z.infer<typeof DeleteUploadedFileInputSchema>

const DeleteUploadedFileOutputSchema = z.object({ success: z.boolean() })
export type DeleteUploadedFileOutput = z.infer<typeof DeleteUploadedFileOutputSchema>

export async function deleteUploadedFile(
	input: DeleteUploadedFileInput,
): Promise<DeleteUploadedFileOutput> {
	return deleteUploadedFileFlow(input)
}

const deleteUploadedFileFlow = async ({
	filename,
}: DeleteUploadedFileInput): Promise<DeleteUploadedFileOutput> => {
	try {
		await deleteFromStorage(`uploads/${filename}`)
		console.log(`Deleted uploaded file: ${filename}`)
		return { success: true }
	} catch (error) {
		console.error('Failed to delete uploaded file %s:', filename, error)
		// Even if it fails (e.g., file not found), we can consider it a "success"
		// from the user's perspective of wanting the file gone.
		return { success: false }
	}
}
