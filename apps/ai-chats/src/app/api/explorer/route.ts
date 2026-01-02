// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2025 Seventeen Sierra LLC

import { getCategories, getConversations } from '@ai-chat/backend'

export async function GET() {
    const [conversations, categories] = await Promise.all([getConversations(), getCategories()])

    return Response.json({
        conversations,
        categories,
    })
}
