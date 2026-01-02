// SPDX-License-Identifier: PolyForm-Strict-1.0.0
// SPDX-FileCopyrightText: 2025 Seventeen Sierra LLC

'use server'

/**
 * @fileOverview A flow to enrich a single conversation transcript with intelligent, AI-driven backlinks.
 */

import type { ConversationTurn } from '@ai-chat/shared/types'
import { ConversationTurnSchema } from '@ai-chat/shared/types/zod'
import { z } from 'zod'
import { ai } from '../core/genkit'

// Define the structure for a single conversation passed to the flow
const EnrichTranscriptInputSchema = z.object({
	transcript: z.array(ConversationTurnSchema).describe('The conversation transcript to analyze.'),
	allTitles: z
		.array(z.string())
		.describe('A list of all other conversation titles to consider for backlinking.'),
	currentTitle: z
		.string()
		.describe('The title of the current conversation, to avoid self-linking.'),
})
export type EnrichTranscriptInput = z.infer<typeof EnrichTranscriptInputSchema>

// Define the output schema for the flow
const EnrichTranscriptOutputSchema = z.object({
	enrichedTranscript: z
		.array(ConversationTurnSchema)
		.describe('The transcript with [[wikilink]] style backlinks added where appropriate.'),
})
export type EnrichTranscriptOutput = z.infer<typeof EnrichTranscriptOutputSchema>

export async function enrichTranscript(
	input: EnrichTranscriptInput,
): Promise<EnrichTranscriptOutput> {
	return enrichTranscriptFlow(input)
}

const backlinkingPrompt = ai.definePrompt({
	name: 'intelligentBacklinkingPrompt',
	model: 'googleai/gemini-1.5-flash-latest',
	input: { schema: EnrichTranscriptInputSchema },
	output: { schema: EnrichTranscriptOutputSchema },
	prompt: `You are an expert at creating knowledge graphs. Your task is to analyze a conversation transcript and intelligently add backlinks to other related conversations.

You will be given a transcript and a list of all other available conversation titles. Read through the transcript and identify any key concepts, entities, or phrases that are directly related to one of the titles in the list.

When you find a relevant phrase, enclose it in double square brackets, like [[this]].

RULES:
- Do NOT link the current conversation's own title (provided as 'currentTitle').
- Be selective. Only link important concepts that have a strong connection to the other titles.
- Do not invent new links. Only link to titles from the provided list.
- Preserve the original structure of the transcript perfectly. The only change should be the addition of [[wikilinks]].
- The output format must be a valid JSON object matching the schema.

LIST OF AVAILABLE CONVERSATION TITLES TO LINK TO:
{{#each allTitles}}
- {{this}}
{{/each}}

CURRENT CONVERSATION TITLE (DO NOT LINK THIS):
{{{currentTitle}}}

TRANSCRIPT TO ANALYZE AND ENRICH:
{{{JSON.stringify transcript}}}
`,
})

const enrichTranscriptFlow = ai.defineFlow(
	{
		name: 'enrichTranscriptFlow',
		inputSchema: EnrichTranscriptInputSchema,
		outputSchema: EnrichTranscriptOutputSchema,
	},
	async (input) => {
		// Retry mechanism for transient AI errors
		const maxRetries = 3
		let lastError: Error | null = null

		for (let attempt = 0; attempt < maxRetries; attempt++) {
			try {
				const result = await backlinkingPrompt(input)
				// Basic validation to ensure the output looks plausible
				if (!result.output?.enrichedTranscript || result.output.enrichedTranscript.length === 0) {
					throw new Error('AI returned empty or invalid transcript data.')
				}
				return result.output
			} catch (err) {
				lastError = err instanceof Error ? err : new Error(String(err))
				console.warn('Attempt %d failed:', attempt + 1, lastError.message)
				if (attempt < maxRetries - 1) {
					await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)))
				}
			}
		}

		console.error('Backlinking AI call failed after retries.', lastError)
		throw new Error('Failed to enrich transcript with backlinks.')
	},
)
