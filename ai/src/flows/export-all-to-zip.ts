// SPDX-License-Identifier: PolyForm-Strict-1.0.0
// SPDX-FileCopyrightText: 2025 Seventeen Sierra LLC

'use server'

/**
 * @fileOverview A flow to export all processed conversations with transcripts to a zip file.
 * Conversations are organized into folders based on their category.
 */

import { getConversationsWithTranscript } from '@ai-chat/backend/queries'
import JSZip from 'jszip'
import { z } from 'zod'
import { ai } from '../core/genkit'
import { exportToMarkdown } from './export-to-markdown'

const ExportAllToZipInputSchema = z.object({})
export type ExportAllToZipInput = z.infer<typeof ExportAllToZipInputSchema>

const ExportAllToZipOutputSchema = z.object({
	zipContent: z.string().describe('The Base64 encoded content of the zip file.'),
	fileCount: z.number(),
})
export type ExportAllToZipOutput = z.infer<typeof ExportAllToZipOutputSchema>

export async function exportAllToZip(input: ExportAllToZipInput): Promise<ExportAllToZipOutput> {
	return exportAllToZipFlow(input)
}

const exportAllToZipFlow = ai.defineFlow(
	{
		name: 'exportAllToZipFlow',
		inputSchema: ExportAllToZipInputSchema,
		outputSchema: ExportAllToZipOutputSchema,
	},
	async () => {
		// 1. Fetch all conversations that have a transcript
		const conversationsToExport = await getConversationsWithTranscript()

		if (conversationsToExport.length === 0) {
			throw new Error('No conversations with transcripts found to export.')
		}

		const zip = new JSZip()

		// 2. Generate markdown for each and add to zip inside category folders
		for (const convo of conversationsToExport) {
			if (convo.transcript) {
				const { markdownContent } = await exportToMarkdown({
					title: convo.title,
					createdAt: convo.createdAt,
					category: convo.category,
					transcript: convo.transcript,
				})

				// Sanitize title for filename: replace invalid characters with underscore.
				const sanitizedTitle = convo.title.replace(/[\\/:"*?<>|]+/g, '_').replace(/\s+/g, '_')
				const filename = `${sanitizedTitle}.md`

				// Determine the folder path based on the category.
				const folderName = convo.category || 'Uncategorized'
				const folder = zip.folder(folderName)

				if (folder) {
					folder.file(filename, markdownContent)
				}
			}
		}

		// 3. Generate zip content as Base64
		const zipContent = await zip.generateAsync({ type: 'base64' })

		return {
			zipContent,
			fileCount: conversationsToExport.length,
		}
	},
)
