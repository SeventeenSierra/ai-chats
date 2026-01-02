// SPDX-License-Identifier: PolyForm-Strict-1.0.0
// SPDX-FileCopyrightText: 2025 Seventeen Sierra LLC

'use server'

/**
 * @fileOverview A flow to delete all conversations from the database.
 * This deletes all conversations to support the simplified pipeline reset.
 */

import { deleteAllConversations } from '@ai-chat/backend/queries'
import { z } from 'zod'
import { ai } from '../core/genkit'

const DeleteStagedConversationsInputSchema = z.object({})
export type DeleteStagedConversationsInput = z.infer<typeof DeleteStagedConversationsInputSchema>

const DeleteStagedConversationsOutputSchema = z.object({
	success: z.boolean(),
	deletedCount: z.number(),
})
export type DeleteStagedConversationsOutput = z.infer<typeof DeleteStagedConversationsOutputSchema>

export async function deleteStagedConversations(
	input: DeleteStagedConversationsInput,
): Promise<DeleteStagedConversationsOutput> {
	return deleteStagedConversationsFlow(input)
}

const deleteStagedConversationsFlow = ai.defineFlow(
	{
		name: 'deleteStagedConversationsFlow',
		inputSchema: DeleteStagedConversationsInputSchema,
		outputSchema: DeleteStagedConversationsOutputSchema,
	},
	async () => {
		try {
			const deletedCount = await deleteAllConversations()
			console.log(`Deleted ${deletedCount} conversation(s) from database.`)
			return { success: true, deletedCount }
		} catch (error) {
			console.error('Failed to delete conversations from database:', error)
			return { success: false, deletedCount: 0 }
		}
	},
)
