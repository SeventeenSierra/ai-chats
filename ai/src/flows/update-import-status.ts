// SPDX-License-Identifier: PolyForm-Strict-1.0.0
// SPDX-FileCopyrightText: 2025 Seventeen Sierra LLC

'use server'

/**
 * @fileOverview A flow to update the status of an import job in PostgreSQL.
 */

import { getDb } from '@ai-chat/backend/database'
import { z } from 'zod'

const UpdateImportStatusInputSchema = z.object({
	jobId: z.string(),
	status: z.enum([
		'starting',
		'splitting',
		'processing',
		'enriching',
		'staged',
		'completed',
		'failed',
		'cancelled',
	]),
	total: z.number().optional(),
	processed: z.number().optional(),
	progress: z.number().optional(),
	message: z.string().optional(),
	error: z.string().optional(),
	filename: z.string().optional(),
})
export type UpdateImportStatusInput = z.infer<typeof UpdateImportStatusInputSchema>

const UpdateImportStatusOutputSchema = z.object({
	success: z.boolean(),
})
export type UpdateImportStatusOutput = z.infer<typeof UpdateImportStatusOutputSchema>

export async function updateImportStatus(
	input: UpdateImportStatusInput,
): Promise<UpdateImportStatusOutput> {
	return updateImportStatusFlow(input)
}

const updateImportStatusFlow = async (payload: UpdateImportStatusInput) => {
	try {
		const { jobId, status, total, processed, progress, message, error, filename } = payload

		// SQLite Upsert
		const db = getDb()
		db.prepare(
			`
        INSERT INTO import_jobs (id, status, filename, message, total, processed, progress, error, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT (id) DO UPDATE SET
          status = excluded.status,
          filename = COALESCE(excluded.filename, import_jobs.filename),
          message = COALESCE(excluded.message, import_jobs.message),
          total = COALESCE(excluded.total, import_jobs.total),
          processed = COALESCE(excluded.processed, import_jobs.processed),
          progress = COALESCE(excluded.progress, import_jobs.progress),
          error = COALESCE(excluded.error, import_jobs.error),
          updated_at = datetime('now')
      `,
		).run(
			jobId,
			status,
			filename || null,
			message || null,
			total || 0,
			processed || 0,
			progress || 0,
			error || null,
		)

		return { success: true }
	} catch (err) {
		console.error('Failed to update status for job %s', payload.jobId, err)
		return { success: false }
	}
}

// Helper to get job status
// Helper to get job status
export async function getImportJobStatus(jobId: string): Promise<UpdateImportStatusInput | null> {
	try {
		const result = getDb().prepare('SELECT * FROM import_jobs WHERE id = ?').get(jobId) as any
		if (!result) return null

		return {
			jobId: result.id,
			status: result.status,
			filename: result.filename,
			message: result.message,
			total: result.total,
			processed: result.processed,
			progress: result.progress,
			error: result.error,
		}
	} catch {
		return null
	}
}
