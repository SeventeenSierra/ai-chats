// SPDX-License-Identifier: PolyForm-Strict-1.0.0
// SPDX-FileCopyrightText: 2025 Seventeen Sierra LLC

'use server'

/**
 * @fileOverview A flow to delete all files from the 'staging' directory.
 * This corresponds to the 'undo' action for Stage 1b of the pipeline.
 */

import { z } from 'zod'
import { deleteStorageDirectory } from './wipe-data'

const DeleteStagedFilesInputSchema = z.object({})
export type DeleteStagedFilesInput = z.infer<typeof DeleteStagedFilesInputSchema>

const DeleteStagedFilesOutputSchema = z.object({ success: z.boolean(), deletedCount: z.number() })
export type DeleteStagedFilesOutput = z.infer<typeof DeleteStagedFilesOutputSchema>

export async function deleteStagedFiles(
	_input: DeleteStagedFilesInput,
): Promise<DeleteStagedFilesOutput> {
	return deleteStagedFilesFlow()
}

const deleteStagedFilesFlow = async (): Promise<DeleteStagedFilesOutput> => {
	try {
		const deletedCount = await deleteStorageDirectory('staging/')
		return { success: true, deletedCount }
	} catch (error) {
		console.error('Failed to delete staged files:', error)
		return { success: false, deletedCount: 0 }
	}
}
