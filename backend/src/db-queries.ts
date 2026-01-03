// SPDX-License-Identifier: PolyForm-Strict-1.0.0
// SPDX-FileCopyrightText: 2025 Seventeen Sierra LLC

'use server'

import type { AppCategory, Conversation } from '@ai-chat/shared/types'
import { v4 as uuidv4 } from 'uuid'
import { pool } from './database'
import type { GroundingData, ThinkingTrace } from './xml-parser'

export async function getConversations(): Promise<Conversation[]> {
	try {
		const result = await pool.query(`
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
        is_deep_research as "isDeepResearch",
        (transcript IS NOT NULL) as "hasTranscript"
      FROM conversations 
      ORDER BY created_at DESC 
      LIMIT 500
    `)
		return result.rows
	} catch (error) {
		console.error('Error fetching conversations:', error)
		return []
	}
}

export async function getConversationById(id: string): Promise<Conversation | null> {
	try {
		const result = await pool.query(
			`
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
        is_deep_research as "isDeepResearch",
        transcript
      FROM conversations 
      WHERE id = $1
    `,
			[id],
		)
		const row = result.rows[0]
		if (!row) return null

		// Parse the transcript JSON string if it exists
		if (row.transcript && typeof row.transcript === 'string') {
			try {
				row.transcript = JSON.parse(row.transcript)
			} catch (e) {
				console.error('Failed to parse transcript JSON for conversation:', id, e)
				row.transcript = null
			}
		}

		return row
	} catch (error) {
		console.error('Error fetching conversation:', error)
		return null
	}
}

export async function getCategories(): Promise<AppCategory[]> {
	try {
		const result = await pool.query(`
      SELECT 
        c.name, 
        COALESCE(COUNT(conv.id), 0)::int as count
      FROM categories c
      LEFT JOIN conversations conv ON conv.category = c.name
      GROUP BY c.name
      ORDER BY c.name
    `)
		return result.rows
	} catch (error) {
		console.error('Error fetching categories:', error)
		return []
	}
}

export async function updateConversationCategory(id: string, newCategory: string): Promise<void> {
	const client = await pool.connect()
	try {
		await client.query('BEGIN')

		// Ensure category exists
		await client.query(
			`
      INSERT INTO categories (name) VALUES ($1) 
      ON CONFLICT (name) DO NOTHING
    `,
			[newCategory],
		)

		// Update conversation
		await client.query(
			`
      UPDATE conversations 
      SET category = $1, categorized_at = NOW() 
      WHERE id = $2
    `,
			[newCategory, id],
		)

		await client.query('COMMIT')
	} catch (error) {
		await client.query('ROLLBACK')
		console.error('Error updating conversation category:', error)
		throw new Error('Failed to update category.')
	} finally {
		client.release()
	}
}

export async function addCategory(name: string): Promise<void> {
	if (!name || name.trim().length === 0) {
		throw new Error('Category name cannot be empty.')
	}

	try {
		await pool.query(
			`
      INSERT INTO categories (name) VALUES ($1)
    `,
			[name],
		)
	} catch (error: unknown) {
		if ((error as { code?: string }).code === '23505') {
			throw new Error(`Category "${name}" already exists.`)
		}
		throw error
	}
}

export async function renameCategory(oldName: string, newName: string): Promise<void> {
	if (!oldName || !newName || oldName === newName) {
		throw new Error('Invalid category names provided for rename.')
	}

	const client = await pool.connect()
	try {
		await client.query('BEGIN')

		// Create new category
		await client.query(
			`
      INSERT INTO categories (name) VALUES ($1)
    `,
			[newName],
		)

		// Update conversations
		await client.query(
			`
      UPDATE conversations 
      SET category = $1, categorized_at = NOW() 
      WHERE category = $2
    `,
			[newName, oldName],
		)

		// Delete old category
		await client.query(
			`
      DELETE FROM categories WHERE name = $1
    `,
			[oldName],
		)

		await client.query('COMMIT')
	} catch (error) {
		await client.query('ROLLBACK')
		throw error
	} finally {
		client.release()
	}
}

export async function saveConversation(
	conversation: Partial<Conversation> & { id: string },
	thinkingTraces?: ThinkingTrace[],
	groundingData?: GroundingData | null,
	activityType?: string
): Promise<void> {
	const client = await pool.connect()
	try {
		await client.query('BEGIN')

		await client.query(
			`
    INSERT INTO conversations (
      id, title, created_at, status, has_rich_content,
      first_prompt, first_response, turn_count, char_count,
      storage_filename, category, is_deep_research, activity_type
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    ON CONFLICT (id) DO UPDATE SET
      title = EXCLUDED.title,
      category = EXCLUDED.category,
      summary = EXCLUDED.summary,
      is_deep_research = EXCLUDED.is_deep_research,
      turn_count = EXCLUDED.turn_count,
      char_count = EXCLUDED.char_count,
      has_rich_content = EXCLUDED.has_rich_content,
      activity_type = EXCLUDED.activity_type
  `,
			[
				conversation.id,
				conversation.title || 'Untitled',
				conversation.createdAt || new Date().toISOString(),
				conversation.status || 'processed',
				conversation.hasRichContent || false,
				conversation.firstPrompt || null,
				conversation.firstResponse || null,
				conversation.turnCount || 0,
				conversation.charCount || 0,
				conversation.storageFilename || null,
				conversation.category || null,
				conversation.isDeepResearch || false,
				activityType || 'natural_language'
			],
		)

		// Save Thinking Traces
		if (thinkingTraces && thinkingTraces.length > 0) {
			// Clear existing traces for this conversation to avoid duplicates on re-import
			await client.query('DELETE FROM thinking_traces WHERE conversation_id = $1', [
				conversation.id,
			])

			for (const trace of thinkingTraces) {
				await client.query(
					`
          INSERT INTO thinking_traces (conversation_id, step_number, content, action_type, metadata_json)
          VALUES ($1, $2, $3, $4, $5)
        `,
					[
						conversation.id,
						trace.step_number,
						trace.content,
						trace.action_type,
						JSON.stringify(trace.metadata_json),
					],
				)
			}
		}

		// Save Grounding Data
		if (groundingData) {
			await client.query(
				`
        INSERT INTO grounding_data (conversation_id, raw_chunks_json, raw_supports_json)
        VALUES ($1, $2, $3)
        ON CONFLICT (conversation_id) DO UPDATE SET
          raw_chunks_json = EXCLUDED.raw_chunks_json,
          raw_supports_json = EXCLUDED.raw_supports_json
      `,
				[
					conversation.id,
					JSON.stringify(groundingData.raw_chunks_json),
					JSON.stringify(groundingData.raw_supports_json),
				],
			)
		}

		await client.query('COMMIT')
	} catch (error) {
		await client.query('ROLLBACK')
		console.error('Error saving conversation:', error)
		throw error
	} finally {
		client.release()
	}
}

export async function getConversationsToFetch(): Promise<Conversation[]> {
	try {
		const result = await pool.query(`
      SELECT 
        id, title, created_at as "createdAt", status, 
        has_rich_content as "hasRichContent",
        turn_count as "turnCount", 
        char_count as "charCount",
        storage_filename as "storageFilename",
        category
      FROM conversations 
      WHERE storage_filename IS NOT NULL
        AND transcript IS NULL
      ORDER BY created_at DESC
    `)
		return result.rows
	} catch (error) {
		console.error('Error fetching conversations to fetch:', error)
		return []
	}
}

export async function getConversationsToBacklink(): Promise<Conversation[]> {
	try {
		const result = await pool.query(`
      SELECT 
        id, title, created_at as "createdAt", status,
        storage_filename as "storageFilename",
        category, backlinked_at as "backlinkedAt"
      FROM conversations 
      WHERE backlinked_at IS NULL
      ORDER BY created_at DESC
    `)
		return result.rows
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
		retryCount?: number
		lastError?: string | null
	},
): Promise<void> {
	const setClauses: string[] = []
	const values: unknown[] = []
	let paramIndex = 1

	if (updates.transcript !== undefined) {
		setClauses.push(`transcript = $${paramIndex++}`)
		values.push(JSON.stringify(updates.transcript))
	}
	if (updates.summary !== undefined) {
		setClauses.push(`summary = $${paramIndex++}`)
		values.push(updates.summary)
	}
	if (updates.summarizedAt !== undefined) {
		setClauses.push(`summarized_at = $${paramIndex++}`)
		values.push(updates.summarizedAt)
	}
	if (updates.categorizedAt !== undefined) {
		setClauses.push(`categorized_at = $${paramIndex++}`)
		values.push(updates.categorizedAt)
	}
	if (updates.backlinkedAt !== undefined) {
		setClauses.push(`backlinked_at = $${paramIndex++}`)
		values.push(updates.backlinkedAt)
	}
	if (updates.status !== undefined) {
		setClauses.push(`status = $${paramIndex++}`)
		values.push(updates.status)
	}
	if (updates.retryCount !== undefined) {
		setClauses.push(`retry_count = $${paramIndex++}`)
		values.push(updates.retryCount)
	}
	if (updates.lastError !== undefined) {
		setClauses.push(`last_error = $${paramIndex++}`)
		values.push(updates.lastError)
	}

	if (setClauses.length === 0) {
		return // Nothing to update
	}

	values.push(id)
	await pool.query(
		`UPDATE conversations SET ${setClauses.join(', ')} WHERE id = $${paramIndex}`,
		values,
	)
}

export async function deleteAllConversations(): Promise<number> {
	// Clean Wipe: Truncate binders as well (Cascades to conversations via FK if configured, otherwise we delete manually)
	// Since we defined ON DELETE SET NULL for binders, we need to delete conversations first or just truncate.
	// But to be safe and thorough for "Wipe Data":
	await pool.query('TRUNCATE table conversations, binders, thinking_traces, grounding_data RESTART IDENTITY CASCADE')
	return 0
}

export async function getConversationsWithTranscript(): Promise<Conversation[]> {
	try {
		const result = await pool.query(`
      SELECT 
        id, title, created_at as "createdAt", status,
        storage_filename as "storageFilename",
        category, transcript
      FROM conversations 
      WHERE transcript IS NOT NULL
      ORDER BY created_at DESC
    `)
		return result.rows.map(row => {
			if (row.transcript && typeof row.transcript === 'string') {
				try {
					row.transcript = JSON.parse(row.transcript)
				} catch (e) {
					console.error('Failed to parse transcript JSON for conversation:', row.id, e)
					row.transcript = null
				}
			}
			return row
		})
	} catch (error) {
		console.error('Error fetching conversations with transcript:', error)
		return []
	}
}

export async function getQuarantinedCount(): Promise<number> {
	const result = await pool.query(`
    SELECT COUNT(*)::int as count FROM conversations WHERE status = 'quarantined'
  `)
	return result.rows[0].count
}
