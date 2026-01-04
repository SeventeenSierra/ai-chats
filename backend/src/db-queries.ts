// SPDX-License-Identifier: PolyForm-Strict-1.0.0
// SPDX-FileCopyrightText: 2025 Seventeen Sierra LLC

'use server'

import type { AppCategory, Conversation } from '@ai-chat/shared/types'
import { getDb } from './database'

export async function getConversations(): Promise<Conversation[]> {
	try {
		const stmt = getDb().prepare(`
      SELECT 
        id, title, created_at as "createdAt", status, 
        has_rich_content as "hasRichContent", 
        first_prompt as "firstPrompt",
        first_response as "firstResponse",
        turn_count as "turnCount", 
        char_count as "charCount",
        storage_filename as "storageFilename",
        category, summary,
        summarized_at as "summarizedAt",
        categorized_at as "categorizedAt",
        backlinked_at as "backlinkedAt",
        is_deep_research as "isDeepResearch"
      FROM conversations 
      ORDER BY created_at DESC 
      LIMIT 500
    `)
		const rows = stmt.all() as any[]
		return rows.map((row) => ({
			...row,
			hasRichContent: Boolean(row.hasRichContent),
			isDeepResearch: Boolean(row.isDeepResearch),
		}))
	} catch (error) {
		console.error('Error fetching conversations:', error)
		return []
	}
}

export async function getCategories(): Promise<AppCategory[]> {
	try {
		const stmt = getDb().prepare(`
      SELECT 
        c.name, 
        COALESCE(COUNT(conv.id), 0) as count
      FROM categories c
      LEFT JOIN conversations conv ON conv.category = c.name
      GROUP BY c.name
      ORDER BY c.name
    `)
		return stmt.all() as AppCategory[]
	} catch (error) {
		console.error('Error fetching categories:', error)
		return []
	}
}

export async function updateConversationCategory(id: string, newCategory: string): Promise<void> {
	const db = getDb()
	const tx = db.transaction(() => {
		// Ensure category exists
		db.prepare(`INSERT OR IGNORE INTO categories (name) VALUES (?)`).run(newCategory)

		// Update conversation
		db.prepare(
			`UPDATE conversations SET category = ?, categorized_at = datetime('now') WHERE id = ?`,
		).run(newCategory, id)
	})

	try {
		tx()
	} catch (error) {
		console.error('Error updating conversation category:', error)
		throw new Error('Failed to update category.')
	}
}

export async function addCategory(name: string): Promise<void> {
	if (!name || name.trim().length === 0) {
		throw new Error('Category name cannot be empty.')
	}

	try {
		getDb().prepare(`INSERT INTO categories (name) VALUES (?)`).run(name)
	} catch (error: any) {
		if (error.code === 'SQLITE_CONSTRAINT_PRIMARYKEY') {
			throw new Error(`Category "${name}" already exists.`)
		}
		throw error
	}
}

export async function renameCategory(oldName: string, newName: string): Promise<void> {
	if (!oldName || !newName || oldName === newName) {
		throw new Error('Invalid category names provided for rename.')
	}

	const db = getDb()
	const tx = db.transaction(() => {
		// Create new category
		db.prepare(`INSERT OR IGNORE INTO categories (name) VALUES (?)`).run(newName)

		// Update conversations
		db.prepare(
			`UPDATE conversations SET category = ?, categorized_at = datetime('now') WHERE category = ?`,
		).run(newName, oldName)

		// Delete old category
		db.prepare(`DELETE FROM categories WHERE name = ?`).run(oldName)
	})

	tx()
}

export async function saveConversation(
	conversation: Partial<Conversation> & { id: string },
): Promise<void> {
	const stmt = getDb().prepare(`
    INSERT INTO conversations (
      id, title, created_at, status, has_rich_content,
      first_prompt, first_response, turn_count, char_count,
      storage_filename, category, is_deep_research
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      category = excluded.category,
      summary = excluded.summary,
      is_deep_research = excluded.is_deep_research
  `)

	stmt.run(
		conversation.id,
		conversation.title || 'Untitled',
		conversation.createdAt || new Date().toISOString(),
		conversation.status || 'processed',
		conversation.hasRichContent ? 1 : 0,
		conversation.firstPrompt || null,
		conversation.firstResponse || null,
		conversation.turnCount || 0,
		conversation.charCount || 0,
		conversation.storageFilename || null,
		conversation.category || null,
		conversation.isDeepResearch ? 1 : 0,
	)
}

export async function getConversationsToFetch(): Promise<Conversation[]> {
	try {
		const stmt = getDb().prepare(`
      SELECT 
        id, title, created_at as "createdAt", status, 
        has_rich_content as "hasRichContent",
        turn_count as "turnCount", 
        char_count as "charCount",
        storage_filename as "storageFilename",
        category
      FROM conversations 
      WHERE storage_filename IS NOT NULL
      ORDER BY created_at DESC
    `)
		const rows = stmt.all() as any[]
		return rows.map((row) => ({
			...row,
			hasRichContent: Boolean(row.hasRichContent),
		}))
	} catch (error) {
		console.error('Error fetching conversations to fetch:', error)
		return []
	}
}

export async function getConversationsToBacklink(): Promise<Conversation[]> {
	try {
		const stmt = getDb().prepare(`
      SELECT 
        id, title, created_at as "createdAt", status,
        storage_filename as "storageFilename",
        category, backlinked_at as "backlinkedAt"
      FROM conversations 
      WHERE backlinked_at IS NULL
      ORDER BY created_at DESC
    `)
		return stmt.all() as Conversation[]
	} catch (error) {
		console.error('Error fetching conversations to backlink:', error)
		return []
	}
}

export async function updateConversationById(
	id: string,
	updates: {
		transcript?: unknown
		summary?: string | null
		summarizedAt?: string
		categorizedAt?: string
		backlinkedAt?: string
		status?: 'processed' | 'quarantined' | 'archived'
	},
): Promise<void> {
	const setClauses: string[] = []
	const values: any[] = []

	if (updates.transcript !== undefined) {
		setClauses.push(`transcript = ?`)
		values.push(JSON.stringify(updates.transcript))
	}
	if (updates.summary !== undefined) {
		setClauses.push(`summary = ?`)
		values.push(updates.summary)
	}
	if (updates.summarizedAt !== undefined) {
		setClauses.push(`summarized_at = ?`)
		values.push(updates.summarizedAt)
	}
	if (updates.categorizedAt !== undefined) {
		setClauses.push(`categorized_at = ?`)
		values.push(updates.categorizedAt)
	}
	if (updates.backlinkedAt !== undefined) {
		setClauses.push(`backlinked_at = ?`)
		values.push(updates.backlinkedAt)
	}
	if (updates.status !== undefined) {
		setClauses.push(`status = ?`)
		values.push(updates.status)
	}

	if (setClauses.length === 0) {
		return // Nothing to update
	}

	values.push(id)
	const sql = `UPDATE conversations SET ${setClauses.join(', ')} WHERE id = ?`
	getDb()
		.prepare(sql)
		.run(...values)
}

export async function deleteAllConversations(): Promise<number> {
	const result = getDb().prepare('DELETE FROM conversations').run()
	return result.changes
}

export async function getConversationsWithTranscript(): Promise<Conversation[]> {
	try {
		const stmt = getDb().prepare(`
      SELECT 
        id, title, created_at as "createdAt", status,
        storage_filename as "storageFilename",
        category, transcript
      FROM conversations 
      WHERE transcript IS NOT NULL
      ORDER BY created_at DESC
    `)
		const rows = stmt.all() as any[]
		return rows.map((row) => ({
			...row,
			transcript: row.transcript ? JSON.parse(row.transcript) : undefined,
		}))
	} catch (error) {
		console.error('Error fetching conversations with transcript:', error)
		return []
	}
}

export async function getQuarantinedCount(): Promise<number> {
	const result = getDb()
		.prepare(`SELECT COUNT(*) as count FROM conversations WHERE status = 'quarantined'`)
		.get() as { count: number }
	return result.count
}
