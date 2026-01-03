// SPDX-License-Identifier: PolyForm-Strict-1.0.0
// SPDX-FileCopyrightText: 2025 Seventeen Sierra LLC

/**
 * XML parser utility for Gemini Vault exports.
 * Uses fast-xml-parser for reliable parsing with HTML entity decoding.
 */

import { XMLParser } from 'fast-xml-parser'
import type { ConversationTurn, ConversationTurnPart } from '@ai-chat/shared/types'

// Configure the XML parser with HTML entity decoding
const parser = new XMLParser({
	ignoreAttributes: false,
	parseTagValue: true,
	trimValues: true,
	processEntities: true,
	htmlEntities: true,
})

// Type definitions for parsed XML structure
interface ParsedConversation {
	ConversationId?: string
	ConversationTopic?: string
	ConversationTurns?: {
		ConversationTurn?: ParsedTurn | ParsedTurn[]
	}
}

interface ParsedTurn {
	Timestamp?: string
	Prompt?: {
		Text?: string | string[]
		ToolCode?: string | string[]
		ToolOutput?: string | string[]
	}
	PrimaryResponse?: {
		Text?: string | string[]
		ToolCode?: string | string[]
		ToolOutput?: string | string[]
		'#text'?: string
	}
}

/**
 * Normalizes a value that might be a string, array, or undefined into an array.
 */
function toArray<T>(value: T | T[] | undefined): T[] {
	if (value === undefined) return []
	return Array.isArray(value) ? value : [value]
}

/**
 * Splits the XML string containing multiple conversations into an array of strings,
 * where each string is a single <Conversation> block.
 * Note: This still uses string splitting since we need individual XML strings for storage.
 */
export function splitConversationsXml(xmlString: string): string[] {
	const conversations: string[] = []
	const startTag = '<Conversation>'
	const endTag = '</Conversation>'
	let startIndex = 0

	while (true) {
		const start = xmlString.indexOf(startTag, startIndex)
		if (start === -1) break
		const end = xmlString.indexOf(endTag, start)
		if (end === -1) break
		conversations.push(xmlString.slice(start, end + endTag.length))
		startIndex = end + endTag.length
	}

	return conversations
}

/**
 * Parses a single conversation XML string into a structured object.
 */
function parseConversationXml(conversationXml: string): ParsedConversation | null {
	try {
		const result = parser.parse(conversationXml)
		return result?.Conversation || null
	} catch {
		return null
	}
}

/**
 * Extracts the ConversationId from a single conversation's XML string.
 */
export function getConversationId(conversationXml: string): string | null {
	const parsed = parseConversationXml(conversationXml)
	return parsed?.ConversationId?.toString() || null
}

/**
 * Extracts the ConversationTopic from a single conversation's XML string.
 */
export function getConversationTitle(conversationXml: string): string | null {
	const parsed = parseConversationXml(conversationXml)
	const topic = parsed?.ConversationTopic
	return topic ? String(topic).trim() : null
}

/**
 * Extracts the first Timestamp from a single conversation's XML string.
 */
export function getConversationTimestamp(conversationXml: string): string | null {
	const parsed = parseConversationXml(conversationXml)
	const turns = toArray(parsed?.ConversationTurns?.ConversationTurn)
	return turns[0]?.Timestamp?.toString() || null
}

/**
 * Checks if a conversation's XML contains tool usage or special interactive components.
 * Uses string search for efficiency on these specific patterns.
 */
export function hasRichContent(conversationXml: string): boolean {
	return (
		conversationXml.includes('<ToolCode>') ||
		conversationXml.includes('<ToolOutput>') ||
		conversationXml.includes('deep_research_confirmation_content') ||
		conversationXml.includes('immersive_entry_chip') ||
		conversationXml.includes('image_generation_content') ||
		conversationXml.includes('ResponseId>rc_b')
	)
}

/**
 * Extracts the text from the first <Prompt> tag.
 */
export function getFirstPrompt(conversationXml: string): string | null {
	const parsed = parseConversationXml(conversationXml)
	const turns = toArray(parsed?.ConversationTurns?.ConversationTurn)
	const firstTurn = turns[0]
	if (!firstTurn?.Prompt) return null

	const texts = toArray(firstTurn.Prompt.Text)
	return texts[0]?.toString().trim() || null
}

/**
 * Extracts all content from the first <PrimaryResponse> tag.
 * If the response is a research plan confirmation, returns a standardized message.
 */
export function getFirstResponse(conversationXml: string): string | null {
	// Check for research confirmation content first (string search is faster)
	if (
		conversationXml.includes('deep_research_confirmation_content') ||
		conversationXml.includes('immersive_entry_chip')
	) {
		return "The model's response included a research plan or interactive component, which is not available in this preview."
	}

	const parsed = parseConversationXml(conversationXml)
	const turns = toArray(parsed?.ConversationTurns?.ConversationTurn)
	const firstTurn = turns[0]
	if (!firstTurn?.PrimaryResponse) return null

	const parts: string[] = []
	const response = firstTurn.PrimaryResponse

	// Extract Text content
	for (const text of toArray(response.Text)) {
		if (text) parts.push(String(text).trim())
	}

	// Extract ToolCode content (format as code block)
	for (const code of toArray(response.ToolCode)) {
		if (code) parts.push('```\n' + String(code).trim() + '\n```')
	}

	// Extract ToolOutput content
	for (const output of toArray(response.ToolOutput)) {
		if (output) parts.push(String(output).trim())
	}

	return parts.length > 0 ? parts.join('\n\n') : null
}

/**
 * Counts the number of <ConversationTurn> tags, multiplied by 2 for prompt/response pairs.
 */
export function getTurnCount(conversationXml: string): number {
	const parsed = parseConversationXml(conversationXml)
	const turns = toArray(parsed?.ConversationTurns?.ConversationTurn)
	// Each ConversationTurn has a prompt and a response, so count as 2 turns
	return turns.length * 2
}

/**
 * Helper function to extract content parts from a parsed prompt or response block.
 */
function extractPartsFromBlock(block: ParsedTurn['Prompt'] | ParsedTurn['PrimaryResponse']): ConversationTurnPart[] {
	if (!block) return []
	const parts: ConversationTurnPart[] = []

	// Extract Text content
	for (const text of toArray(block.Text)) {
		const content = String(text).trim()
		if (content) {
			parts.push({ type: 'text', content })
		}
	}

	// Extract ToolCode content
	for (const code of toArray(block.ToolCode)) {
		const content = String(code).trim()
		if (content) {
			parts.push({ type: 'code', content })
		}
	}

	// Extract ToolOutput content
	for (const output of toArray(block.ToolOutput)) {
		const content = String(output).trim()
		if (content) {
			parts.push({ type: 'text', content: `Tool Output:\n\`\`\`\n${content}\n\`\`\`` })
		}
	}

	return parts
}

/**
 * Parses the full transcript from a conversation's XML string.
 */
export function parseConversationTranscript(conversationXml: string): ConversationTurn[] {
	const parsed = parseConversationXml(conversationXml)
	if (!parsed) return []

	const turns: ConversationTurn[] = []
	const conversationTurns = toArray(parsed.ConversationTurns?.ConversationTurn)

	for (const turn of conversationTurns) {
		const timestamp = turn.Timestamp?.toString()

		// Process user prompt
		if (turn.Prompt) {
			const userParts = extractPartsFromBlock(turn.Prompt)
			if (userParts.length > 0) {
				turns.push({ author: 'user', parts: userParts, timestamp })
			}
		}

		// Process model response
		if (turn.PrimaryResponse) {
			const modelParts = extractPartsFromBlock(turn.PrimaryResponse)
			if (modelParts.length > 0) {
				turns.push({ author: 'model', parts: modelParts, timestamp })
			}
		}
	}

	return turns
}
