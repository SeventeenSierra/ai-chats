// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2025 Seventeen Sierra LLC

import { fetchAndSaveTranscripts } from '@ai-chat/ai'
import { type NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/fetch-transcripts
 * 
 * Triggers the transcript fetching process for all conversations
 * that have a storageFilename but no transcript.
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json().catch(() => ({}))
        const { conversationId } = body
        const jobId = `fetch-${Date.now()}`

        // Fire-and-forget background job
        fetchAndSaveTranscripts({ jobId, conversationId })

        return NextResponse.json({
            success: true,
            jobId,
            message: conversationId
                ? `Transcript fetching started for ${conversationId}.`
                : 'Transcript fetching started for all conversations in background.',
        })
    } catch (error) {
        console.error('Fetch transcripts error:', error)
        return NextResponse.json({ error: 'Failed to start transcript fetch' }, { status: 500 })
    }
}
