// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2025 Seventeen Sierra LLC

import { getImportJobStatus, processConversations, splitImportedFile } from '@ai-chat/ai'
import { uploadToStorage } from '@ai-chat/backend'
import { type NextRequest, NextResponse } from 'next/server'

// Helper to wait for a job to complete
async function waitForJobCompletion(
	jobId: string,
	maxWaitMs = 60000,
	pollIntervalMs = 1000,
): Promise<boolean> {
	const startTime = Date.now()
	while (Date.now() - startTime < maxWaitMs) {
		const status = await getImportJobStatus(jobId)
		if (status?.status === 'completed') {
			return true
		}
		if (status?.status === 'failed' || status?.status === 'cancelled') {
			console.error(`[Upload] Job ${jobId} ended with status: ${status.status}`)
			return false
		}
		await new Promise((resolve) => setTimeout(resolve, pollIntervalMs))
	}
	console.warn(`[Upload] Timeout waiting for job ${jobId} to complete`)
	return false
}

export async function POST(request: NextRequest) {
	try {
		const formData = await request.formData()
		const file = formData.get('file') as File

		if (!file) {
			return NextResponse.json({ error: 'No file provided' }, { status: 400 })
		}

		const content = await file.text()
		const filename = `${Date.now()}-${file.name}`

		// Step 1: Upload to S3 in uploads/ prefix
		await uploadToStorage(`uploads/${filename}`, content)
		console.log(`[Upload] File uploaded: ${filename}`)

		// Step 2: Kick off the background processing pipeline
		const jobId = `auto-${Date.now()}`
		const splitJobId = `${jobId}-split`

		// Split the file into individual conversations (in staging/)
		// This starts the background job
		await splitImportedFile({ filename, jobId: splitJobId })

		// Step 3: Start background task to wait for split and then process
		// This runs in the background without blocking the response
		;(async () => {
			try {
				// Wait for split to complete
				const splitCompleted = await waitForJobCompletion(splitJobId, 120000, 2000)

				if (splitCompleted) {
					console.log(`[Upload] Split job ${splitJobId} completed, starting processing...`)
					await processConversations({
						jobId: `${jobId}-process`,
						splitJobId: splitJobId,
					})
				} else {
					console.error(`[Upload] Split job ${splitJobId} did not complete successfully`)
				}
			} catch (e) {
				console.error('[Upload] Background processing error:', e)
			}
		})()

		return NextResponse.json({
			success: true,
			filename,
			jobId, // Return jobId for frontend polling
			message: 'File uploaded. Processing started in background.',
		})
	} catch (error) {
		console.error('Upload error:', error)
		return NextResponse.json({ error: 'Failed to upload' }, { status: 500 })
	}
}
