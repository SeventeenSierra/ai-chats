// SPDX-License-Identifier: PolyForm-Strict-1.0.0
// SPDX-FileCopyrightText: 2025 Seventeen Sierra LLC

'use server'

/**
 * @fileOverview A utility to convert a conversation object into a Markdown string.
 * This function does not use AI. It now assumes backlinking is already done.
 */

import type { ConversationTurn } from '@ai-chat/shared/types'
import { ConversationTurnSchema } from '@ai-chat/shared/types/zod'
import { z } from 'zod'

const ExportToMarkdownInputSchema = z.object({
	title: z.string(),
	createdAt: z.string(),
	category: z.string().optional(),
	transcript: z.array(ConversationTurnSchema),
	// allTitles is no longer needed here as backlinking is a separate step.
})
export type ExportToMarkdownInput = z.infer<typeof ExportToMarkdownInputSchema>

const ExportToMarkdownOutputSchema = z.object({
	markdownContent: z.string(),
})
export type ExportToMarkdownOutput = z.infer<typeof ExportToMarkdownOutputSchema>

function formatTurn(turn: ConversationTurn): string {
	const author = turn.author.charAt(0).toUpperCase() + turn.author.slice(1)

	const content = turn.parts
		.map((part) => {
			const partContent = part.content

			// Backlinks like [[Topic]] are now assumed to be in the content already.
			// We just need to handle code blocks.
			if (part.type === 'code') {
				return `\`\`\`\n${partContent}\n\`\`\``
			}
			return partContent
		})
		.join('\n\n')

	return `> [!NOTE] ${author}\n> ${content.replace(/\n/g, '\n> ')}`
}

export async function exportToMarkdown(
	input: ExportToMarkdownInput,
): Promise<ExportToMarkdownOutput> {
	return exportToMarkdownFlow(input)
}

const exportToMarkdownFlow = async ({
	title,
	createdAt,
	category,
	transcript,
}: ExportToMarkdownInput): Promise<ExportToMarkdownOutput> => {
	let markdownContent = `# ${title}\n\n`

	// Add metadata
	markdownContent += `**Created:** ${new Date(createdAt).toLocaleString()}\n`
	if (category) {
		markdownContent += `**Category:** [[${category}]]\n`
	}
	markdownContent += '\n---\n\n'

	// Add transcript turns
	transcript.forEach((turn) => {
		markdownContent += `${formatTurn(turn)}\n\n`
	})

	return { markdownContent }
}
