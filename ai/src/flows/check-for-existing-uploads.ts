// SPDX-License-Identifier: PolyForm-Strict-1.0.0
// SPDX-FileCopyrightText: 2025 Seventeen Sierra LLC

'use server'

/**
 * @fileOverview A flow to check for existing files in the 'uploads' directory using S3.
 */

import { listFromStorage } from '@ai-chat/backend/storage'
import { z } from 'zod'

const CheckForExistingUploadsInputSchema = z.object({})
export type CheckForExistingUploadsInput = z.infer<typeof CheckForExistingUploadsInputSchema>

const CheckForExistingUploadsOutputSchema = z.object({
	filename: z.string().nullable(),
})
export type CheckForExistingUploadsOutput = z.infer<typeof CheckForExistingUploadsOutputSchema>

export async function checkForExistingUploads(
	_input: CheckForExistingUploadsInput,
): Promise<CheckForExistingUploadsOutput> {
	return checkForExistingUploadsFlow()
}

const checkForExistingUploadsFlow = async (): Promise<CheckForExistingUploadsOutput> => {
	console.log('Checking for existing uploads...')
	try {
		const files = await listFromStorage('uploads/')

		if (files.length > 0) {
			// Return the first file found (strip prefix)
			const filename = files[0].replace('uploads/', '')
			console.log(`Found existing upload: ${filename}`)
			return { filename }
		}

		console.log('No existing uploads found.')
		return { filename: null }
	} catch (error) {
		console.error('Failed to check for existing uploads:', error)
		return { filename: null }
	}
}
