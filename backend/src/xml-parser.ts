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
 * Extracts the ConversationId from a single conversation's XML string.
 * @param conversationXml The XML string for a single conversation.
 * @returns The conversation ID or null if not found.
 */
export function getConversationId(conversationXml: string): string | null {
	const startTag = '<ConversationId>'
	const endTag = '</ConversationId>'
	const start = conversationXml.indexOf(startTag)
	if (start === -1) return null
	const end = conversationXml.indexOf(endTag, start)
	if (end === -1) return null
	return conversationXml.slice(start + startTag.length, end)
}

/**
 * Extracts the ConversationTopic from a single conversation's XML string.
 * This is now strict and will NOT fall back to using a prompt.
 * @param conversationXml The XML string for a single conversation.
 * @returns The conversation topic or null if not found.
 */
export function getConversationTitle(conversationXml: string): string | null {
	const startTag = '<ConversationTopic>'
	const endTag = '</ConversationTopic>'
	const start = conversationXml.indexOf(startTag)
	if (start === -1) return null
	const end = conversationXml.indexOf(endTag, start)
	if (end === -1) return null

	const content = conversationXml.slice(start + startTag.length, end).trim()
	if (content) {
		return decodeEntities(content)
	}

	return null
}

/**
 * Extracts the first Timestamp from a single conversation's XML string.
 * @param conversationXml The XML string for a single conversation.
 * @returns The ISO 8601 timestamp string or null if not found.
 */
export function getConversationTimestamp(conversationXml: string): string | null {
	const startTag = '<Timestamp>'
	const endTag = '</Timestamp>'
	const start = conversationXml.indexOf(startTag)
	if (start === -1) return null
	const end = conversationXml.indexOf(endTag, start)
	if (end === -1) return null
	return conversationXml.slice(start + startTag.length, end)
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
	const promptStart = conversationXml.indexOf('<Prompt>')
	if (promptStart === -1) return null
	const promptEnd = conversationXml.indexOf('</Prompt>', promptStart)
	if (promptEnd === -1) return null

	const promptContent = conversationXml.slice(promptStart + 8, promptEnd)
	const textStart = promptContent.indexOf('<Text>')
	if (textStart === -1) return null
	const textEnd = promptContent.indexOf('</Text>', textStart)
	if (textEnd === -1) return null

	const text = promptContent.slice(textStart + 6, textEnd).trim()
	return text ? decodeEntities(text) : null
}

/**
 * Extracts all content from the first <PrimaryResponse> tag, including text and tool usage.
 * If the response is a research plan confirmation, it returns a standardized message.
 * @param conversationXml The XML string for a single conversation.
 * @returns The combined first response text or null if not found.
 */
export function getFirstResponse(conversationXml: string): string | null {
	// Find the first ConversationTurn
	const turnStart = conversationXml.indexOf('<ConversationTurn>')
	if (turnStart === -1) return null
	const turnEnd = conversationXml.indexOf('</ConversationTurn>', turnStart)
	if (turnEnd === -1) return null

	const turnContent = conversationXml.slice(turnStart, turnEnd)

	// Find PrimaryResponse within this turn
	const responseStart = turnContent.indexOf('<PrimaryResponse>')
	if (responseStart === -1) return null
	const responseEnd = turnContent.indexOf('</PrimaryResponse>', responseStart)
	if (responseEnd === -1) return null

	const primaryResponseContent = turnContent.slice(responseStart + 17, responseEnd)

	// Check for research confirmation URLs and return a standardized message if found.
	if (
		primaryResponseContent.includes('deep_research_confirmation_content') ||
		primaryResponseContent.includes('immersive_entry_chip')
	) {
		return "The model's response included a research plan or interactive component, which is not available in this preview."
	}

	// Extract content parts using string-based approach
	const parts: string[] = []
	const extractTagContent = (content: string, tagName: string): void => {
		let searchStart = 0
		const openTag = `<${tagName}>`
		const closeTag = `</${tagName}>`
		while (true) {
			const start = content.indexOf(openTag, searchStart)
			if (start === -1) break
			const end = content.indexOf(closeTag, start)
			if (end === -1) break
			const tagContent = content.slice(start + openTag.length, end).trim()
			if (tagContent) {
				const decodedContent = decodeEntities(tagContent)
				if (tagName === 'ToolCode') {
					parts.push(`\`\`\`\n${decodedContent}\n\`\`\``)
				} else {
					parts.push(decodedContent)
				}
			}
			searchStart = end + closeTag.length
		}
	}

	extractTagContent(primaryResponseContent, 'Text')
	extractTagContent(primaryResponseContent, 'ToolCode')
	extractTagContent(primaryResponseContent, 'ToolOutput')

	return parts.length > 0 ? parts.join('\n\n') : null
}

/**
 * Counts the number of <ConversationTurn> tags, multiplied by 2 to account for prompt/response pairs.
 * @param conversationXml The XML string for a single conversation.
 * @returns The number of turns.
 */
export function getTurnCount(conversationXml: string): number {
	const tag = '<ConversationTurn>'
	let count = 0
	let pos = 0
	while (true) {
		pos = conversationXml.indexOf(tag, pos)
		if (pos === -1) break
		count++
		pos += tag.length
	}
	// Each <ConversationTurn> has a prompt and a response, so we count it as 2 turns.
	return count * 2
}

/**
 * Helper function to extract content parts from a given XML block (e.g., a <Prompt> or <PrimaryResponse>).
 * @param blockXml The XML content of the block.
 * @returns An array of ConversationTurnPart objects.
 */
function extractPartsFromBlock(blockXml: string): ConversationTurnPart[] {
	const parts: ConversationTurnPart[] = []

	const extractTag = (tagName: string): void => {
		let searchStart = 0
		const openTag = `<${tagName}>`
		const closeTag = `</${tagName}>`
		while (true) {
			const start = blockXml.indexOf(openTag, searchStart)
			if (start === -1) break
			const end = blockXml.indexOf(closeTag, start)
			if (end === -1) break
			const content = decodeEntities(blockXml.slice(start + openTag.length, end).trim())
			if (content) {
				if (tagName === 'ToolCode') {
					parts.push({ type: 'code', content })
				} else if (tagName === 'ToolOutput') {
					parts.push({ type: 'text', content: `Tool Output:\n\`\`\`\n${content}\n\`\`\`` })
				} else {
					parts.push({ type: 'text', content })
				}
			}
			searchStart = end + closeTag.length
		}
	}

	extractTag('Text')
	extractTag('ToolCode')
	extractTag('ToolOutput')

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

	// Find ConversationTurns block using indexOf
	const turnsStart = conversationXml.indexOf('<ConversationTurns>')
	if (turnsStart === -1) return []
	const turnsEnd = conversationXml.indexOf('</ConversationTurns>', turnsStart)
	if (turnsEnd === -1) return []

	const turnsXml = conversationXml.slice(turnsStart + 19, turnsEnd)

	// Extract each ConversationTurn using indexOf loop
	let searchStart = 0
	const turnStartTag = '<ConversationTurn>'
	const turnEndTag = '</ConversationTurn>'
	const timestampStartTag = '<Timestamp>'
	const timestampEndTag = '</Timestamp>'
	const promptStartTag = '<Prompt>'
	const promptEndTag = '</Prompt>'
	const responseStartTag = '<PrimaryResponse>'
	const responseEndTag = '</PrimaryResponse>'

	while (true) {
		const turnStart = turnsXml.indexOf(turnStartTag, searchStart)
		if (turnStart === -1) break
		const turnEnd = turnsXml.indexOf(turnEndTag, turnStart)
		if (turnEnd === -1) break

		const turnXml = turnsXml.slice(turnStart + turnStartTag.length, turnEnd)
		searchStart = turnEnd + turnEndTag.length

		// Extract timestamp
		let timestamp: string | undefined
		const tsStart = turnXml.indexOf(timestampStartTag)
		if (tsStart !== -1) {
			const tsEnd = turnXml.indexOf(timestampEndTag, tsStart)
			if (tsEnd !== -1) {
				timestamp = turnXml.slice(tsStart + timestampStartTag.length, tsEnd)
			}
		}

		// 1. Process the user's prompt
		const promptStart = turnXml.indexOf(promptStartTag)
		if (promptStart !== -1) {
			const promptEnd = turnXml.indexOf(promptEndTag, promptStart)
			if (promptEnd !== -1) {
				const promptContent = turnXml.slice(promptStart + promptStartTag.length, promptEnd)
				const userParts = extractPartsFromBlock(promptContent)
				if (userParts.length > 0) {
					turns.push({ author: 'user', parts: userParts, timestamp })
				}
			}
		}

		// 2. Process the model's response
		const responseStart = turnXml.indexOf(responseStartTag)
		if (responseStart !== -1) {
			const responseEnd = turnXml.indexOf(responseEndTag, responseStart)
			if (responseEnd !== -1) {
				const responseContent = turnXml.slice(responseStart + responseStartTag.length, responseEnd)
				const modelParts = extractPartsFromBlock(responseContent)
				if (modelParts.length > 0) {
					turns.push({ author: 'model', parts: modelParts, timestamp })
				}
			}
		}
	}

	return turns
}
