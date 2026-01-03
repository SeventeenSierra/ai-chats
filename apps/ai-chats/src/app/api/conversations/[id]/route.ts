// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2025 Seventeen Sierra LLC

import { getConversationById } from '@ai-chat/backend'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params
	const conversation = await getConversationById(id)

	if (!conversation) {
		return Response.json({ error: 'Conversation not found' }, { status: 404 })
	}

	return Response.json(conversation)
}
