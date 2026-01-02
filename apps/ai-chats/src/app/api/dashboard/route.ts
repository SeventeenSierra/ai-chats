// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2025 Seventeen Sierra LLC

import { getCategories, getConversations, getQuarantinedCount } from '@ai-chat/backend'

export async function GET() {
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
}
