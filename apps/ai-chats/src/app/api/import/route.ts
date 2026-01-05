// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2025 Seventeen Sierra LLC

import {
	getConversationId,
	getConversationTimestamp,
	getConversationTitle,
	getFirstPrompt,
	getFirstResponse,
	getTurnCount,
	hasRichContent,
	saveConversation,
	splitConversationsXml,
	uploadToStorage,
} from '@ai-chat/backend'
import { type NextRequest, NextResponse } from 'next/server'

function isDeepResearch(xml: string): boolean {
	return xml.includes('deep_researcher') || xml.includes('deep_research')
}

export async function POST(request: NextRequest) {
	try {
		const formData = await request.formData()
		const file = formData.get('file') as File

		if (!file) {
			return NextResponse.json({ error: 'No file provided' }, { status: 400 })
		}

		const xmlContent = await file.text()
		const conversations = splitConversationsXml(xmlContent)

		let imported = 0
		let errors = 0

		for (const conversationXml of conversations) {
			try {
				const id = getConversationId(conversationXml)
				if (!id) continue

				const title = getConversationTitle(conversationXml) || 'Untitled'
				const createdAt = getConversationTimestamp(conversationXml) || new Date().toISOString()
				const storageFilename = `${id}.xml`

				// Save to storage
				await uploadToStorage(storageFilename, Buffer.from(conversationXml), 'text/xml')

				// Save metadata to database
				await saveConversation({
					id,
					title,
					createdAt,
					status: 'processed',
					hasRichContent: hasRichContent(conversationXml),
					firstPrompt: getFirstPrompt(conversationXml) || undefined,
					firstResponse: getFirstResponse(conversationXml) || undefined,
					turnCount: getTurnCount(conversationXml),
					charCount: conversationXml.length,
					storageFilename,
					isDeepResearch: isDeepResearch(conversationXml),
				})

				imported++
			} catch (err) {
				console.error('Error importing conversation:', err)
				errors++
			}
		}

		return NextResponse.json({
			success: true,
			imported,
			errors,
			total: conversations.length,
		})
	} catch (error) {
		console.error('Import error:', error)
		return NextResponse.json({ error: 'Failed to import' }, { status: 500 })
	}
}
