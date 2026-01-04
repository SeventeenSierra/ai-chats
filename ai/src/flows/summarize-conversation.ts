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
		console.error('Error generating summary:', error)
		throw new Error('Failed to generate summary.')
	}
}
