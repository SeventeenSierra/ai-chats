// SPDX-License-Identifier: PolyForm-Strict-1.0.0
// SPDX-FileCopyrightText: 2025 Seventeen Sierra LLC

// Summarize Conversation Flow
'use server'

/**
 * @fileOverview Summarizes a given conversation transcript.
 *
 * - summarizeConversation - A function that summarizes the conversation transcript.
 * - SummarizeConversationInput - The input type for the summarizeConversation function.
 * - SummarizeConversationOutput - The return type for the summarizeConversation function.
 */

import { z } from 'zod'
import { ai, model } from '../core/openai'

const SummarizeConversationInputSchema = z.object({
	transcript: z.string().describe('The conversation transcript to be summarized.'),
})
export type SummarizeConversationInput = z.infer<typeof SummarizeConversationInputSchema>

const SummarizeConversationOutputSchema = z.object({
	summary: z.string().describe('A concise summary of the conversation.'),
})
export type SummarizeConversationOutput = z.infer<typeof SummarizeConversationOutputSchema>

const summarizeConversationPrompt = `Summarize the following conversation transcript in a concise manner:

Transcript:
`

export async function summarizeConversation(
	input: SummarizeConversationInput,
): Promise<SummarizeConversationOutput> {
	const maxRetries = 3
	let lastError: Error | null = null

	for (let attempt = 1; attempt <= maxRetries; attempt++) {
		try {
			const completion = await ai.chat.completions.create({
				model: model,
				messages: [
					{
						role: 'user',
						content: summarizeConversationPrompt + input.transcript,
					},
				],
			})

			const summary = completion.choices[0]?.message?.content || 'No summary generated.'
			return { summary }
		} catch (error) {
			lastError = error instanceof Error ? error : new Error(String(error))

			const isLastAttempt = attempt === maxRetries
			if (!isLastAttempt) {
				const delay = 2 ** attempt * 1000 + Math.random() * 500
				console.warn(
					`Attempt ${attempt} failed: ${lastError.message}. Retrying in ${Math.round(delay)}ms...`,
				)
				await new Promise((resolve) => setTimeout(resolve, delay))
			}
		}
	}

	console.error('Summarization failed after retries:', lastError)
	throw new Error('Failed to generate summary.')
}
