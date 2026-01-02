// SPDX-License-Identifier: PolyForm-Strict-1.0.0
// SPDX-FileCopyrightText: 2025 Seventeen Sierra LLC

'use server'

/**
 * @fileOverview A robust flow to categorize a single conversation.
 * This is part of a new, more resilient architecture.
 */

import { z } from 'zod'
import { ai } from '../core/genkit'

// Define the structure for a single conversation passed to the flow
const ConversationInputSchema = z.object({
	id: z.string(),
	title: z.string(),
})

// Define the input schema for the flow
const CategorizeSingleConversationInputSchema = z.object({
	conversation: ConversationInputSchema,
	existingCategories: z
		.array(z.string())
		.describe('A list of categories that have already been created.'),
})
export type CategorizeSingleConversationInput = z.infer<
	typeof CategorizeSingleConversationInputSchema
>

// Define the output schema for the flow
const CategorizeSingleConversationOutputSchema = z.object({
	category: z
		.string()
		.describe(
			'The name of the category this conversation belongs to. This can be an existing category or a new one.',
		),
})
export type CategorizeSingleConversationOutput = z.infer<
	typeof CategorizeSingleConversationOutputSchema
>

export async function categorizeSingleConversation(
	input: CategorizeSingleConversationInput,
): Promise<CategorizeSingleConversationOutput> {
	return categorizeSingleConversationFlow(input)
}

const categorizationPrompt = ai.definePrompt({
	name: 'singleConversationCategorizationPrompt',
	model: 'googleai/gemini-1.5-flash-latest',
	input: { schema: CategorizeSingleConversationInputSchema },
	output: { schema: CategorizeSingleConversationOutputSchema },
	prompt: `You are an expert project manager. Your task is to assign a single conversation to a category.

You will be given the conversation's title and a list of categories that already exist.

Analyze the conversation title:
- Title: "{{conversation.title}}"

Here are the existing categories:
{{#if existingCategories}}
  {{#each existingCategories}}
  - {{this}}
  {{/each}}
{{else}}
(No categories exist yet)
{{/if}}

RULES:
1.  Read the title and decide if it fits well into one of the EXISTING categories.
2.  If it fits, return that exact category name.
3.  If it does not fit well, create a NEW, short, descriptive category name for it. For example, "UI Development" or "API Integration".
4.  Your response MUST be the name of the category, and nothing else.
`,
})

const categorizeSingleConversationFlow = ai.defineFlow(
	{
		name: 'categorizeSingleConversationFlow',
		inputSchema: CategorizeSingleConversationInputSchema,
		outputSchema: CategorizeSingleConversationOutputSchema,
	},
	async (input) => {
		// Retry mechanism for transient AI errors
		const maxRetries = 3
		let lastError: Error | null = null

		for (let attempt = 0; attempt < maxRetries; attempt++) {
			try {
				const result = await categorizationPrompt(input)
				// Validate that the AI returned a plausible, non-empty category.
				if (!result.output?.category) {
					throw new Error('AI returned empty or invalid category data.')
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

		console.error('AI categorization failed after retries.', lastError)
		throw new Error('AI categorization failed to return valid output.')
	},
)
