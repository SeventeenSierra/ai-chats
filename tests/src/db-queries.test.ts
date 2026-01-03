// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2025 Seventeen Sierra LLC

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Use vi.hoisted to define mock functions that will be accessible in the mock factory
const { mockQuery, mockConnect, mockClient } = vi.hoisted(() => ({
    mockQuery: vi.fn(),
    mockConnect: vi.fn(),
    mockClient: {
        query: vi.fn(),
        release: vi.fn(),
    },
}))

// Mock the database module before importing db-queries
vi.mock('@ai-chat/backend/database', () => ({
    pool: {
        query: mockQuery,
        connect: mockConnect,
    },
}))

// Now import the functions we want to test
import {
    getConversations,
    getConversationById,
    saveConversation,
    updateConversationById,
    getConversationsToFetch,
} from '@ai-chat/backend/queries'

describe('db-queries', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockConnect.mockResolvedValue(mockClient)
        mockClient.query.mockResolvedValue({ rows: [] })
    })

    describe('getConversations', () => {
        it('should return mapped conversation rows', async () => {
            const mockRows = [
                {
                    id: 'conv-1',
                    title: 'Test Conversation',
                    createdAt: '2024-07-19T16:30:00.000Z',
                    status: 'processed',
                    hasRichContent: false,
                    firstPrompt: 'Hello',
                    firstResponse: 'Hi there',
                    turnCount: 2,
                    charCount: 100,
                    storageFilename: 'conv-1.xml',
                    category: 'general',
                    summary: null,
                    summarizedAt: null,
                    categorizedAt: null,
                    backlinkedAt: null,
                    isDeepResearch: false,
                    hasTranscript: true,
                },
            ]
            mockQuery.mockResolvedValue({ rows: mockRows })

            const result = await getConversations()

            expect(result).toHaveLength(1)
            expect(result[0].id).toBe('conv-1')
            expect(result[0].title).toBe('Test Conversation')
            expect(mockQuery).toHaveBeenCalledTimes(1)
        })

        it('should return empty array on error', async () => {
            mockQuery.mockRejectedValue(new Error('Database error'))

            const result = await getConversations()

            expect(result).toEqual([])
        })

        it('should return empty array when no conversations exist', async () => {
            mockQuery.mockResolvedValue({ rows: [] })

            const result = await getConversations()

            expect(result).toEqual([])
        })
    })

    describe('getConversationById', () => {
        it('should return a single conversation with parsed transcript', async () => {
            const mockRow = {
                id: 'conv-1',
                title: 'Test Conversation',
                createdAt: '2024-07-19T16:30:00.000Z',
                status: 'processed',
                transcript: JSON.stringify([{ author: 'user', parts: [] }]),
            }
            mockQuery.mockResolvedValue({ rows: [mockRow] })

            const result = await getConversationById('conv-1')

            expect(result).not.toBeNull()
            expect(result?.id).toBe('conv-1')
            expect(result?.transcript).toEqual([{ author: 'user', parts: [] }])
            expect(mockQuery).toHaveBeenCalledWith(expect.any(String), ['conv-1'])
        })

        it('should return null for non-existent conversation', async () => {
            mockQuery.mockResolvedValue({ rows: [] })

            const result = await getConversationById('non-existent')

            expect(result).toBeNull()
        })

        it('should handle invalid JSON in transcript', async () => {
            const mockRow = {
                id: 'conv-1',
                title: 'Test Conversation',
                transcript: 'invalid-json{{{',
            }
            mockQuery.mockResolvedValue({ rows: [mockRow] })

            const result = await getConversationById('conv-1')

            expect(result).not.toBeNull()
            expect(result?.transcript).toBeNull()
        })

        it('should return null on database error', async () => {
            mockQuery.mockRejectedValue(new Error('Database error'))

            const result = await getConversationById('conv-1')

            expect(result).toBeNull()
        })
    })

    describe('getConversationsToFetch', () => {
        it('should return conversations with storage_filename but no transcript', async () => {
            const mockRows = [
                {
                    id: 'conv-1',
                    storageFilename: 'conv-1.xml',
                    category: null,
                },
                {
                    id: 'conv-2',
                    storageFilename: 'conv-2.xml',
                    category: 'general',
                },
            ]
            mockQuery.mockResolvedValue({ rows: mockRows })

            const result = await getConversationsToFetch()

            expect(result).toHaveLength(2)
            // Verify the SQL includes the correct WHERE clause
            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining('storage_filename IS NOT NULL'),
            )
            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining('transcript IS NULL'),
            )
        })

        it('should return empty array on error', async () => {
            mockQuery.mockRejectedValue(new Error('Database error'))

            const result = await getConversationsToFetch()

            expect(result).toEqual([])
        })
    })

    describe('updateConversationById', () => {
        it('should update a single field', async () => {
            mockQuery.mockResolvedValue({ rows: [] })

            await updateConversationById('conv-1', {
                summary: 'Updated summary',
            })

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining('summary = $1'),
                ['Updated summary', 'conv-1'],
            )
        })

        it('should update multiple fields', async () => {
            mockQuery.mockResolvedValue({ rows: [] })

            await updateConversationById('conv-1', {
                summary: 'Updated summary',
                status: 'quarantined',
                retryCount: 3,
            })

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining('summary'),
                expect.arrayContaining(['Updated summary', 'quarantined', 3, 'conv-1']),
            )
        })

        it('should not execute query if no updates provided', async () => {
            await updateConversationById('conv-1', {})

            expect(mockQuery).not.toHaveBeenCalled()
        })

        it('should serialize transcript to JSON', async () => {
            mockQuery.mockResolvedValue({ rows: [] })

            const transcript = [{ author: 'user', parts: [{ type: 'text', content: 'Hello' }] }]
            await updateConversationById('conv-1', { transcript })

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining('transcript'),
                [JSON.stringify(transcript), 'conv-1'],
            )
        })
    })

    describe('saveConversation', () => {
        it('should insert a new conversation', async () => {
            mockClient.query.mockResolvedValue({ rows: [] })

            await saveConversation({
                id: 'conv-1',
                title: 'Test Conversation',
                createdAt: '2024-07-19T16:30:00.000Z',
                status: 'processed',
            })

            expect(mockConnect).toHaveBeenCalled()
            expect(mockClient.query).toHaveBeenCalledWith('BEGIN')
            expect(mockClient.query).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO conversations'),
                expect.arrayContaining(['conv-1', 'Test Conversation']),
            )
            expect(mockClient.query).toHaveBeenCalledWith('COMMIT')
            expect(mockClient.release).toHaveBeenCalled()
        })

        it('should save thinking traces', async () => {
            mockClient.query.mockResolvedValue({ rows: [] })

            const thinkingTraces = [
                {
                    step_number: 1,
                    content: 'print("Hello")',
                    action_type: 'tool_code' as const,
                    metadata_json: {},
                },
            ]

            await saveConversation({ id: 'conv-1' }, thinkingTraces)

            // Should delete existing traces
            expect(mockClient.query).toHaveBeenCalledWith(
                'DELETE FROM thinking_traces WHERE conversation_id = $1',
                ['conv-1'],
            )
            // Should insert new traces
            expect(mockClient.query).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO thinking_traces'),
                expect.arrayContaining(['conv-1', 1, 'print("Hello")', 'tool_code']),
            )
        })

        it('should save grounding data', async () => {
            mockClient.query.mockResolvedValue({ rows: [] })

            const groundingData = {
                raw_chunks_json: [{ title: 'Source 1' }],
                raw_supports_json: [{ segment: 'text' }],
            }

            await saveConversation({ id: 'conv-1' }, undefined, groundingData)

            expect(mockClient.query).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO grounding_data'),
                expect.arrayContaining([
                    'conv-1',
                    JSON.stringify(groundingData.raw_chunks_json),
                    JSON.stringify(groundingData.raw_supports_json),
                ]),
            )
        })

        it('should rollback on error', async () => {
            mockClient.query
                .mockResolvedValueOnce({ rows: [] }) // BEGIN
                .mockRejectedValueOnce(new Error('Insert failed')) // INSERT

            await expect(
                saveConversation({
                    id: 'conv-1',
                    title: 'Test Conversation',
                }),
            ).rejects.toThrow('Insert failed')

            expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK')
            expect(mockClient.release).toHaveBeenCalled()
        })
    })
})
