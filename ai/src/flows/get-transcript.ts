// SPDX-License-Identifier: PolyForm-Strict-1.0.0
// SPDX-FileCopyrightText: 2025 Seventeen Sierra LLC

'use server'

/**
 * @fileOverview Fetches and parses the full transcript for a given conversation file from storage.
 */

import { downloadFromStorage } from '@ai-chat/backend/storage'
import { parseConversationTranscript } from '@ai-chat/backend/xml-parser'
import { ConversationTurnSchema } from '@ai-chat/shared/types/zod'
import { z } from 'zod'

const GetTranscriptInputSchema = z.object({
	storageFilename: z
		.string()
		.describe("The filename of the conversation XML in the 'staging/' directory."),
})
export type GetTranscriptInput = z.infer<typeof GetTranscriptInputSchema>

const GetTranscriptOutputSchema = z.object({
	transcript: z.array(ConversationTurnSchema),
})
export type GetTranscriptOutput = z.infer<typeof GetTranscriptOutputSchema>

export async function getTranscript(input: GetTranscriptInput): Promise<GetTranscriptOutput> {
	return getTranscriptFlow(input)
}

const getTranscriptFlow = async ({
	storageFilename,
}: GetTranscriptInput): Promise<GetTranscriptOutput> => {
	try {
		if (!storageFilename) {
			throw new Error('Storage filename is required.')
		}

		console.log(`Fetching transcript for: ${storageFilename}`)
		const xmlContent = (await downloadFromStorage(`staging/${storageFilename}`)).toString('utf-8')

		const transcript = parseConversationTranscript(xmlContent)

		return { transcript }
	} catch (error) {
		console.error('Failed to get transcript for %s:', storageFilename, error)
		const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.'
		throw new Error(`Could not fetch or parse transcript: ${errorMessage}`)
	}
}
