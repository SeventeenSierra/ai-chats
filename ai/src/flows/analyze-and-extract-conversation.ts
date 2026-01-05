// SPDX-License-Identifier: PolyForm-Strict-1.0.0
// SPDX-FileCopyrightText: 2025 Seventeen Sierra LLC

'use server'

/**
 * @fileOverview A utility to extract basic metadata from a raw XML conversation file.
 * This function is designed for a fast, non-AI scan to populate the UI quickly.
 */

import {
	getConversationId,
	getConversationTimestamp,
	getConversationTitle,
	getFirstPrompt,
	getFirstResponse,
	getTurnCount,
	hasRichContent,
	parseConversationTranscript,
} from '@ai-chat/backend/xml-parser'
import type { Conversation } from '@ai-chat/shared/types'
import { z } from 'zod'

// This file no longer defines a Genkit flow, but a simple utility function.
// No AI is used in this step.

const AnalyzeAndExtractInputSchema = z.object({
	xmlContent: z.string().describe('The raw XML content of a single conversation.'),
})
export type AnalyzeAndExtractInput = z.infer<typeof AnalyzeAndExtractInputSchema>

// The output is now a full Conversation object with a 'quarantined' status for bad data.
export type AnalyzeAndExtractOutput = Omit<Conversation, 'summary' | 'category'>

const LONG_TITLE_THRESHOLD = 150

/**
 * Extracts metadata from an XML string without using AI.
 * This must be async to be used as a server action.
 * @param input The XML content of the conversation.
 * @returns A structured object with the extracted metadata.
 */
export async function analyzeAndExtractConversation(
	input: AnalyzeAndExtractInput,
): Promise<AnalyzeAndExtractOutput> {
	const { xmlContent } = input

	const id = getConversationId(xmlContent)
	const charCount = xmlContent.length

	// A conversation is considered malformed if it lacks a fundamental ID.
	if (!id) {
		return {
			id: `malformed_${Date.now()}`,
			title: 'Malformed Conversation',
			createdAt: new Date().toISOString(),
			status: 'quarantined',
			hasRichContent: false,
			firstPrompt: '',
			firstResponse: '',
			turnCount: 0,
			charCount: charCount,
			transcript: [],
		}
	}

	const extractedTitle = getConversationTitle(xmlContent)
	const title = extractedTitle || 'Untitled Conversation'
	const createdAt = getConversationTimestamp(xmlContent) || new Date().toISOString()
	const transcript = parseConversationTranscript(xmlContent)

	// Quarantine conversations with excessively long titles.
	if (title.length > LONG_TITLE_THRESHOLD) {
		return {
			id,
			title,
			createdAt,
			status: 'quarantined',
			hasRichContent: hasRichContent(xmlContent),
			firstPrompt: getFirstPrompt(xmlContent) || '',
			firstResponse: getFirstResponse(xmlContent) || '',
			turnCount: getTurnCount(xmlContent),
			charCount: charCount,
			transcript,
		}
	}

	return {
		id,
		title,
		createdAt,
		status: 'processed',
		hasRichContent: hasRichContent(xmlContent),
		firstPrompt: getFirstPrompt(xmlContent) || '',
		firstResponse: getFirstResponse(xmlContent) || '',
		turnCount: getTurnCount(xmlContent),
		charCount: charCount,
		transcript,
	}
}
