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

import { z } from 'genkit'
import { ai } from '../core/genkit'

const SummarizeConversationInputSchema = z.object({
	transcript: z.string().describe('The conversation transcript to be summarized.'),
})
export type SummarizeConversationInput = z.infer<typeof SummarizeConversationInputSchema>

const SummarizeConversationOutputSchema = z.object({
	summary: z.string().describe('A concise summary of the conversation.'),
})
export type SummarizeConversationOutput = z.infer<typeof SummarizeConversationOutputSchema>

export async function summarizeConversation(
	input: SummarizeConversationInput,
): Promise<SummarizeConversationOutput> {
	return summarizeConversationFlow(input)
}

const summarizeConversationPrompt = ai.definePrompt({
	name: 'summarizeConversationPrompt',
	input: { schema: SummarizeConversationInputSchema },
	output: { schema: SummarizeConversationOutputSchema },
	prompt: `Summarize the following conversation transcript in a concise manner:

Transcript:
{{{transcript}}}`,
})

const summarizeConversationFlow = ai.defineFlow(
	{
		name: 'summarizeConversationFlow',
		inputSchema: SummarizeConversationInputSchema,
		outputSchema: SummarizeConversationOutputSchema,
	},
	async (input) => {
		const { output } = await summarizeConversationPrompt(input)
		return output!
	},
)
