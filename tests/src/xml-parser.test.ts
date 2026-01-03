// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2025 Seventeen Sierra LLC

import { describe, it, expect } from 'vitest'
import {
    splitConversationsXml,
    getConversationId,
    getConversationTitle,
    getConversationTimestamp,
    hasRichContent,
    getFirstPrompt,
    getFirstResponse,
    getTurnCount,
    parseConversationTranscript,
} from '@ai-chat/backend'

// Sample XML data based on real Gemini Vault export structure
const sampleConversationXml = `<Conversation>
  <ConversationId>c_test123abc</ConversationId>
  <ConversationTopic>Test Conversation Topic</ConversationTopic>
  <ConversationTurns>
    <ConversationTurn>
      <RequestId>r_req123</RequestId>
      <Timestamp>2024-07-19T16:30:00.000000-04:00</Timestamp>
      <Prompt>
        <Text>What is the meaning of life?</Text>
      </Prompt>
      <PrimaryResponse>
        <ResponseId>rc_resp123</ResponseId>
        <Text>The meaning of life is a philosophical question that has been debated for centuries.</Text>
      </PrimaryResponse>
    </ConversationTurn>
    <ConversationTurn>
      <RequestId>r_req456</RequestId>
      <Timestamp>2024-07-19T16:35:00.000000-04:00</Timestamp>
      <Prompt>
        <Text>Can you give me more details?</Text>
      </Prompt>
      <PrimaryResponse>
        <ResponseId>rc_resp456</ResponseId>
        <Text>Of course! Here are some perspectives on the meaning of life.</Text>
      </PrimaryResponse>
    </ConversationTurn>
  </ConversationTurns>
</Conversation>`

const sampleWithToolCode = `<Conversation>
  <ConversationId>c_tooltest</ConversationId>
  <ConversationTopic>Code Execution Test</ConversationTopic>
  <ConversationTurns>
    <ConversationTurn>
      <Timestamp>2024-07-20T10:00:00.000000-04:00</Timestamp>
      <Prompt>
        <Text>Run some Python code</Text>
      </Prompt>
      <PrimaryResponse>
        <ResponseId>rc_code123</ResponseId>
        <Text>Here is the code:</Text>
        <ToolCode>print("Hello, World!")</ToolCode>
        <ToolOutput>Hello, World!</ToolOutput>
      </PrimaryResponse>
    </ConversationTurn>
  </ConversationTurns>
</Conversation>`

const sampleWithDeepResearch = `<Conversation>
  <ConversationId>c_deepresearch</ConversationId>
  <ConversationTopic>Deep Research Test</ConversationTopic>
  <ConversationTurns>
    <ConversationTurn>
      <Timestamp>2024-07-21T14:00:00.000000-04:00</Timestamp>
      <Prompt>
        <Text>Research this topic</Text>
      </Prompt>
      <PrimaryResponse>
        <ResponseId>rc_b_research</ResponseId>
        <Text>deep_research_confirmation_content</Text>
      </PrimaryResponse>
    </ConversationTurn>
  </ConversationTurns>
</Conversation>`

const sampleWithHtmlEntities = `<Conversation>
  <ConversationId>c_entities</ConversationId>
  <ConversationTopic>HTML &amp; Entities Test</ConversationTopic>
  <ConversationTurns>
    <ConversationTurn>
      <Timestamp>2024-07-22T09:00:00.000000-04:00</Timestamp>
      <Prompt>
        <Text>Show me &lt;code&gt; and &quot;quotes&quot;</Text>
      </Prompt>
      <PrimaryResponse>
        <ResponseId>rc_entities</ResponseId>
        <Text>Here&apos;s the result with &amp; symbols</Text>
      </PrimaryResponse>
    </ConversationTurn>
  </ConversationTurns>
</Conversation>`

const multipleConversationsXml = `<?xml version="1.0"?>
<Export>
  ${sampleConversationXml}
  ${sampleWithToolCode}
</Export>`

describe('XML Parser', () => {
    describe('splitConversationsXml', () => {
        it('should split multiple conversations into an array', () => {
            const conversations = splitConversationsXml(multipleConversationsXml)
            expect(conversations).toHaveLength(2)
            expect(conversations[0]).toContain('c_test123abc')
            expect(conversations[1]).toContain('c_tooltest')
        })

        it('should return empty array for XML without conversations', () => {
            const conversations = splitConversationsXml('<Export></Export>')
            expect(conversations).toHaveLength(0)
        })
    })

    describe('getConversationId', () => {
        it('should extract the conversation ID', () => {
            const id = getConversationId(sampleConversationXml)
            expect(id).toBe('c_test123abc')
        })

        it('should return null for missing ID', () => {
            const id = getConversationId('<Conversation></Conversation>')
            expect(id).toBeNull()
        })
    })

    describe('getConversationTitle', () => {
        it('should extract the conversation topic', () => {
            const title = getConversationTitle(sampleConversationXml)
            expect(title).toBe('Test Conversation Topic')
        })

        it('should decode HTML entities in topic', () => {
            const title = getConversationTitle(sampleWithHtmlEntities)
            expect(title).toBe('HTML & Entities Test')
        })

        it('should return null for missing topic', () => {
            const title = getConversationTitle('<Conversation><ConversationId>test</ConversationId></Conversation>')
            expect(title).toBeNull()
        })
    })

    describe('getConversationTimestamp', () => {
        it('should extract the first timestamp', () => {
            const timestamp = getConversationTimestamp(sampleConversationXml)
            expect(timestamp).toBe('2024-07-19T16:30:00.000000-04:00')
        })

        it('should return null for missing timestamp', () => {
            const timestamp = getConversationTimestamp('<Conversation></Conversation>')
            expect(timestamp).toBeNull()
        })
    })

    describe('hasRichContent', () => {
        it('should return true for conversations with ToolCode', () => {
            expect(hasRichContent(sampleWithToolCode)).toBe(true)
        })

        it('should return true for deep research content', () => {
            expect(hasRichContent(sampleWithDeepResearch)).toBe(true)
        })

        it('should return false for plain text conversations', () => {
            expect(hasRichContent(sampleConversationXml)).toBe(false)
        })
    })

    describe('getFirstPrompt', () => {
        it('should extract the first prompt text', () => {
            const prompt = getFirstPrompt(sampleConversationXml)
            expect(prompt).toBe('What is the meaning of life?')
        })

        it('should decode HTML entities in prompt', () => {
            const prompt = getFirstPrompt(sampleWithHtmlEntities)
            expect(prompt).toBe('Show me <code> and "quotes"')
        })
    })

    describe('getFirstResponse', () => {
        it('should extract the first response text', () => {
            const response = getFirstResponse(sampleConversationXml)
            expect(response).toContain('philosophical question')
        })

        it('should return standardized message for deep research', () => {
            const response = getFirstResponse(sampleWithDeepResearch)
            expect(response).toContain('research plan or interactive component')
        })

        it('should include tool code formatted as code block', () => {
            const response = getFirstResponse(sampleWithToolCode)
            expect(response).toContain('```')
            expect(response).toContain('print("Hello, World!")')
        })
    })

    describe('getTurnCount', () => {
        it('should return correct turn count (2 per ConversationTurn)', () => {
            const count = getTurnCount(sampleConversationXml)
            // 2 ConversationTurns * 2 = 4 turns (prompt + response each)
            expect(count).toBe(4)
        })

        it('should return 0 for empty conversations', () => {
            const count = getTurnCount('<Conversation></Conversation>')
            expect(count).toBe(0)
        })
    })

    describe('parseConversationTranscript', () => {
        it('should parse all turns into structured format', () => {
            const turns = parseConversationTranscript(sampleConversationXml)
            expect(turns).toHaveLength(4) // 2 user + 2 model turns
            expect(turns[0].author).toBe('user')
            expect(turns[0].parts[0].content).toBe('What is the meaning of life?')
            expect(turns[1].author).toBe('model')
            expect(turns[1].parts[0].content).toContain('philosophical question')
        })

        it('should include timestamps on turns', () => {
            const turns = parseConversationTranscript(sampleConversationXml)
            expect(turns[0].timestamp).toBe('2024-07-19T16:30:00.000000-04:00')
        })

        it('should handle tool code as code parts', () => {
            const turns = parseConversationTranscript(sampleWithToolCode)
            const modelTurn = turns.find(t => t.author === 'model')
            const codePart = modelTurn?.parts.find(p => p.type === 'code')
            expect(codePart).toBeDefined()
            expect(codePart?.content).toBe('print("Hello, World!")')
        })

        it('should decode HTML entities in transcript', () => {
            const turns = parseConversationTranscript(sampleWithHtmlEntities)
            expect(turns[0].parts[0].content).toBe('Show me <code> and "quotes"')
            expect(turns[1].parts[0].content).toContain("Here's the result with & symbols")
        })
    })
})
