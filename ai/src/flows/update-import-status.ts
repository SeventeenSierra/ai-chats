// SPDX-License-Identifier: PolyForm-Strict-1.0.0
// SPDX-FileCopyrightText: 2025 Seventeen Sierra LLC

'use server'

/**
 * @fileOverview A flow to update the status of an import job in PostgreSQL.
 */

import { pool } from '@ai-chat/backend/database'
import { z } from 'zod'
import { ai } from '../core/genkit'

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

const updateImportStatusFlow = ai.defineFlow(
	{
		name: 'updateImportStatusFlow',
		inputSchema: UpdateImportStatusInputSchema,
		outputSchema: UpdateImportStatusOutputSchema,
	},
	async (payload) => {
		try {
			const { jobId, status, total, processed, progress, message, error, filename } = payload

			// Upsert the import job status
			await pool.query(
				`
        INSERT INTO import_jobs (id, status, filename, message, total, processed, progress, error, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
        ON CONFLICT (id) DO UPDATE SET
          status = EXCLUDED.status,
          filename = COALESCE(EXCLUDED.filename, import_jobs.filename),
          message = COALESCE(EXCLUDED.message, import_jobs.message),
          total = COALESCE(EXCLUDED.total, import_jobs.total),
          processed = COALESCE(EXCLUDED.processed, import_jobs.processed),
          progress = COALESCE(EXCLUDED.progress, import_jobs.progress),
          error = COALESCE(EXCLUDED.error, import_jobs.error),
          updated_at = NOW()
      `,
				[
					jobId,
					status,
					filename || null,
					message || null,
					total || 0,
					processed || 0,
					progress || 0,
					error || null,
				],
			)

			return { success: true }
		} catch (err) {
			console.error('Failed to update status for job %s', payload.jobId, err)
			return { success: false }
		}
	},
)

// Helper to get job status
export async function getImportJobStatus(jobId: string): Promise<UpdateImportStatusInput | null> {
	try {
		const result = await pool.query('SELECT * FROM import_jobs WHERE id = $1', [jobId])
		if (result.rows.length === 0) return null

		const row = result.rows[0]
		return {
			jobId: row.id,
			status: row.status,
			filename: row.filename,
			message: row.message,
			total: row.total,
			processed: row.processed,
			progress: row.progress,
			error: row.error,
		}
	} catch {
		return null
	}
}
