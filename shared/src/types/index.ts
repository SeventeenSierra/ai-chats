// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2025 Seventeen Sierra LLC

export type ConversationTurnPart = {
	type: 'text' | 'code'
	content: string
}

export type ConversationTurn = {
	author: 'user' | 'model'
	parts: ConversationTurnPart[]
	timestamp?: string // Add optional timestamp
}

export type Conversation = {
	id: string
	title: string
	createdAt: string
	status: 'processed' | 'quarantined' | 'archived'
	hasRichContent: boolean
	firstPrompt?: string
	firstResponse?: string
	turnCount: number
	charCount: number
	storageFilename?: string
	transcript?: ConversationTurn[] | null
	summary?: string
	category?: string
	summarizedAt?: string
	categorizedAt?: string
	// New field to track the backlinking state
	backlinkedAt?: string | null
	// Deep Research conversation flag
	isDeepResearch?: boolean
}

export type ConversationGroup = {
	name: string
	conversationIds: string[]
	conversations: Conversation[]
}

export type ImportJob = {
	jobId: string
	filename: string
	status:
		| 'starting'
		| 'splitting'
		| 'processing'
		| 'enriching'
		| 'staged'
		| 'completed'
		| 'failed'
		| 'cancelled'
	total?: number
	processed?: number
	progress?: number
	createdAt: string
	updatedAt?: string
	message?: string
	error?: string
}

export type AppCategory = {
	name: string
	count: number
}
