// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2025 Seventeen Sierra LLC

import { z } from 'zod'

// Zod schema for ConversationTurnPart
export const ConversationTurnPartSchema = z.object({
	type: z.enum(['text', 'code']),
	content: z.string(),
})

// Zod schema for ConversationTurn
export const ConversationTurnSchema = z.object({
	author: z.enum(['user', 'model']),
	parts: z.array(ConversationTurnPartSchema),
	timestamp: z.string().optional(), // Add optional timestamp
})
