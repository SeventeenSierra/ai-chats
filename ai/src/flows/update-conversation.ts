// SPDX-License-Identifier: PolyForm-Strict-1.0.0
// SPDX-FileCopyrightText: 2025 Seventeen Sierra LLC

'use server'

/**
 * @fileOverview A flow to update a conversation document in the database.
 */

import { updateConversationById } from '@ai-chat/backend/queries'
import { ConversationTurnSchema } from '@ai-chat/shared/types/zod'
import { z } from 'zod'
import { ai } from '../core/genkit'

const UpdateConversationInputSchema = z.object({
	id: z.string(),
	transcript: z.array(ConversationTurnSchema).optional().nullable(),
	summary: z.string().optional().nullable(),
	summarizedAt: z.string().optional(),
	categorizedAt: z.string().optional(),
	status: z.enum(['processed', 'quarantined', 'archived']).optional(),
	// Add the new backlinking timestamp
	backlinkedAt: z.string().optional(),
	// Retry tracking
	retryCount: z.number().optional(),
	lastError: z.string().optional().nullable(),
})
export type UpdateConversationInput = z.infer<typeof UpdateConversationInputSchema>

const UpdateConversationOutputSchema = z.object({ success: z.boolean() })
export type UpdateConversationOutput = z.infer<typeof UpdateConversationOutputSchema>

export async function updateConversation(
	input: UpdateConversationInput,
): Promise<UpdateConversationOutput> {
	return updateConversationFlow(input)
}

const updateConversationFlow = ai.defineFlow(
	{
		name: 'updateConversationFlow',
		inputSchema: UpdateConversationInputSchema,
		outputSchema: UpdateConversationOutputSchema,
	},
	async ({ id, ...updateData }) => {
		try {
			await updateConversationById(id, {
				transcript: updateData.transcript,
				summary: updateData.summary,
				summarizedAt: updateData.summarizedAt,
				categorizedAt: updateData.categorizedAt,
				backlinkedAt: updateData.backlinkedAt,
				status: updateData.status,
				retryCount: updateData.retryCount,
				lastError: updateData.lastError,
			})
			return { success: true }
		} catch (error) {
			console.error('Failed to update conversation %s:', id, error)
			return { success: false }
		}
	},
)
