// SPDX-License-Identifier: PolyForm-Strict-1.0.0
// SPDX-FileCopyrightText: 2025 Seventeen Sierra LLC

/**
 * A simple utility to split a large Gemini Vault XML export and extract metadata.
 * This does not perform full parsing, just string manipulation.
 */

import type { ConversationTurn, ConversationTurnPart } from '@ai-chat/shared/types'

// Basic HTML entity decoding
function decodeEntities(encodedString: string): string {
	const translate_re = /&#(\d+);|&#x([0-9a-fA-F]+);/g
	return encodedString
		.replace(translate_re, (match, dec, hex) => {
			if (dec) {
				return String.fromCharCode(Number(dec))
			}
			if (hex) {
				return String.fromCharCode(parseInt(hex, 16))
			}
			return match
		})
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&apos;/g, "'")
		.replace(/&#39;/g, "'")
		.replace(/&amp;/g, '&')
}

/**
 * Splits the XML string containing multiple conversations into an array of strings,
 * where each string is a single <Conversation> block.
 * @param xmlString The full XML content from the export file.
 * @returns An array of XML strings, each being a complete conversation.
 */
export function splitConversationsXml(xmlString: string): string[] {
	const conversationRegex = /<Conversation>[\s\S]*?<\/Conversation>/g
	const matches = xmlString.match(conversationRegex)
	return matches || []
}

/**
 * Extracts the ConversationId from a single conversation's XML string.
 * @param conversationXml The XML string for a single conversation.
 * @returns The conversation ID or null if not found.
 */
export function getConversationId(conversationXml: string): string | null {
	const idRegex = /<ConversationId>(.*?)<\/ConversationId>/
	const match = conversationXml.match(idRegex)
	return match ? match[1] : null
}

/**
 * Extracts the ConversationTopic from a single conversation's XML string.
 * This is now strict and will NOT fall back to using a prompt.
 * @param conversationXml The XML string for a single conversation.
 * @returns The conversation topic or null if not found.
 */
export function getConversationTitle(conversationXml: string): string | null {
	const titleRegex = /<ConversationTopic>([\s\S]*?)<\/ConversationTopic>/
	const match = conversationXml.match(titleRegex)

	if (match && match[1] && match[1].trim()) {
		return decodeEntities(match[1].trim())
	}

	return null
}

/**
 * Extracts the first Timestamp from a single conversation's XML string.
 * @param conversationXml The XML string for a single conversation.
 * @returns The ISO 8601 timestamp string or null if not found.
 */
export function getConversationTimestamp(conversationXml: string): string | null {
	const timestampRegex = /<Timestamp>(.*?)<\/Timestamp>/
	const match = conversationXml.match(timestampRegex)
	return match ? match[1] : null
}

/**
 * Checks if a conversation's XML contains tool usage or special interactive components.
 * This regex checks the entire conversation for a more reliable flag.
 * @param conversationXml The XML string for a single conversation.
 * @returns True if any of the indicators are found, false otherwise.
 */
export function hasRichContent(conversationXml: string): boolean {
	const richContentRegex =
		/<(ToolCode|ToolOutput|ResponseId>rc_b)|deep_research_confirmation_content|immersive_entry_chip|image_generation_content/
	return richContentRegex.test(conversationXml)
}

/**
 * Extracts the text from the first <Prompt> tag.
 * @param conversationXml The XML string for a single conversation.
 * @returns The first prompt text or null if not found.
 */
export function getFirstPrompt(conversationXml: string): string | null {
	const promptRegex = /<Prompt>\s*<Text>([\s\S]*?)<\/Text>\s*<\/Prompt>/
	const match = conversationXml.match(promptRegex)
	if (match && match[1]) {
		return decodeEntities(match[1].trim())
	}
	return null
}

/**
 * Extracts all content from the first <PrimaryResponse> tag, including text and tool usage.
 * If the response is a research plan confirmation, it returns a standardized message.
 * @param conversationXml The XML string for a single conversation.
 * @returns The combined first response text or null if not found.
 */
export function getFirstResponse(conversationXml: string): string | null {
	// First, find the entire content of the first PrimaryResponse.
	const primaryResponseRegex =
		/<ConversationTurn>[\s\S]*?<PrimaryResponse>([\s\S]*?)<\/PrimaryResponse>/
	const primaryResponseMatch = conversationXml.match(primaryResponseRegex)

	if (!primaryResponseMatch || !primaryResponseMatch[1]) {
		return null
	}

	const primaryResponseContent = primaryResponseMatch[1]

	// Check for research confirmation URLs and return a standardized message if found.
	const isRichContentResponse = /deep_research_confirmation_content|immersive_entry_chip/.test(
		primaryResponseContent,
	)
	if (isRichContentResponse) {
		return "The model's response included a research plan or interactive component, which is not available in this preview."
	}

	// If not a research confirmation, extract all content tags within that response block in order.
	const contentRegex = /<(Text|ToolCode|ToolOutput)>([\s\S]*?)<\/\1>/g
	let match
	const parts: string[] = []

	while ((match = contentRegex.exec(primaryResponseContent)) !== null) {
		if (match[2]) {
			const decodedContent = decodeEntities(match[2].trim())
			// Add wrapping for tool code to mimic markdown code blocks for display
			if (match[1] === 'ToolCode') {
				parts.push('```\n' + decodedContent + '\n```')
			} else {
				parts.push(decodedContent)
			}
		}
	}

	return parts.length > 0 ? parts.join('\n\n') : null
}

/**
 * Counts the number of <ConversationTurn> tags, multiplied by 2 to account for prompt/response pairs.
 * @param conversationXml The XML string for a single conversation.
 * @returns The number of turns.
 */
export function getTurnCount(conversationXml: string): number {
	const turnRegex = /<ConversationTurn>/g
	const matches = conversationXml.match(turnRegex)
	// Each <ConversationTurn> has a prompt and a response, so we count it as 2 turns.
	return (matches ? matches.length : 0) * 2
}

/**
 * Helper function to extract content parts from a given XML block (e.g., a <Prompt> or <PrimaryResponse>).
 * @param blockXml The XML content of the block.
 * @returns An array of ConversationTurnPart objects.
 */
function extractPartsFromBlock(blockXml: string): ConversationTurnPart[] {
	const parts: ConversationTurnPart[] = []
	const contentRegex = /<(Text|ToolCode|ToolOutput)>([\s\S]*?)<\/\1>/g
	let match

	while ((match = contentRegex.exec(blockXml)) !== null) {
		const type = match[1]
		const content = decodeEntities(match[2].trim())

		if (type === 'ToolCode') {
			parts.push({ type: 'code', content })
		} else if (type === 'ToolOutput') {
			parts.push({ type: 'text', content: `Tool Output:\n${'```'}\n${content}\n${'```'}` })
		} else {
			// 'Text'
			parts.push({ type: 'text', content })
		}
	}
	return parts
}

/**
 * Parses the full transcript from a conversation's XML string based on the correct structure.
 * This is the refactored, correct implementation.
 * @param conversationXml The XML string for a single conversation.
 * @returns An array of ConversationTurn objects.
 */
export function parseConversationTranscript(conversationXml: string): ConversationTurn[] {
	const turns: ConversationTurn[] = []
	const conversationTurnsRegex = /<ConversationTurns>([\s\S]*?)<\/ConversationTurns>/
	const turnsBlockMatch = conversationXml.match(conversationTurnsRegex)

	if (!turnsBlockMatch) {
		return []
	}

	const turnsXml = turnsBlockMatch[1]
	const turnRegex = /<ConversationTurn>([\s\S]*?)<\/ConversationTurn>/g
	let turnMatch

	while ((turnMatch = turnRegex.exec(turnsXml)) !== null) {
		const turnXml = turnMatch[1]

		const timestampRegex = /<Timestamp>(.*?)<\/Timestamp>/
		const timestampMatch = turnXml.match(timestampRegex)
		const timestamp = timestampMatch ? timestampMatch[1] : undefined

		// 1. Process the user's prompt
		const promptRegex = /<Prompt>([\s\S]*?)<\/Prompt>/
		const promptMatch = turnXml.match(promptRegex)
		if (promptMatch && promptMatch[1]) {
			const userParts = extractPartsFromBlock(promptMatch[1])
			if (userParts.length > 0) {
				turns.push({ author: 'user', parts: userParts, timestamp })
			}
		}

		// 2. Process the model's response
		const responseRegex = /<PrimaryResponse>([\s\S]*?)<\/PrimaryResponse>/
		const responseMatch = turnXml.match(responseRegex)
		if (responseMatch && responseMatch[1]) {
			const modelParts = extractPartsFromBlock(responseMatch[1])
			if (modelParts.length > 0) {
				turns.push({ author: 'model', parts: modelParts, timestamp })
			}
		}
	}

	return turns
}
