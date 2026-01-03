// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2025 Seventeen Sierra LLC

import { getCategories, getConversations, getQuarantinedCount } from '@ai-chat/backend'

export async function GET() {
	try {
		const [conversations, categories, quarantinedCount] = await Promise.all([
			getConversations(),
			getCategories(),
			getQuarantinedCount(),
		])

		return Response.json({
			conversations,
			categories,
			quarantinedCount,
		})
	} catch (error) {
		console.error('Dashboard API error:', error)
		return Response.json(
			{
				conversations: [],
				categories: [],
				quarantinedCount: 0,
				error: 'Database unavailable',
			},
			{ status: 503 },
		)
	}
}
