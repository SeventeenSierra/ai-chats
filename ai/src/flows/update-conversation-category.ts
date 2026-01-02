// SPDX-License-Identifier: PolyForm-Strict-1.0.0
// SPDX-FileCopyrightText: 2025 Seventeen Sierra LLC

'use server'

/**
 * @fileOverview A flow to update the category of a single conversation.
 */

import { updateConversationCategory } from '@ai-chat/backend/queries'
import { z } from 'zod'
import { ai } from '../core/genkit'

const UpdateConversationCategoryInputSchema = z.object({
	conversationId: z.string(),
	newCategory: z.string(),
})
export type UpdateConversationCategoryInput = z.infer<typeof UpdateConversationCategoryInputSchema>

const UpdateConversationCategoryOutputSchema = z.object({ success: z.boolean() })
export type UpdateConversationCategoryOutput = z.infer<
	typeof UpdateConversationCategoryOutputSchema
>

export async function updateConversationCategoryFlow(
	input: UpdateConversationCategoryInput,
): Promise<UpdateConversationCategoryOutput> {
	return updateCategoryFlow(input)
}

const updateCategoryFlow = ai.defineFlow(
	{
		name: 'updateConversationCategoryFlow',
		inputSchema: UpdateConversationCategoryInputSchema,
		outputSchema: UpdateConversationCategoryOutputSchema,
	},
	async ({ conversationId, newCategory }) => {
		try {
			await updateConversationCategory(conversationId, newCategory)
			return { success: true }
		} catch (error) {
			console.error('Failed to update category for conversation %s:', conversationId, error)
			return { success: false }
		}
	},
)
