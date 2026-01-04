import { describe, it, expect } from 'vitest'
import {
    getConversationId,
    getConversationTimestamp,
    getConversationTitle,
    splitConversationsXml,
    getTurnCount,
    hasRichContent,
    parseConversationTranscript,
} from '@ai-chat/backend/xml-parser'

const SINGLE_CONVERSATION = `
<Conversation>
	<ConversationId>c_123456789</ConversationId>
	<ConversationTopic>Test Topic</ConversationTopic>
	<Timestamp>2025-01-01T12:00:00Z</Timestamp>
	<ConversationTurns>
		<ConversationTurn>
			<Timestamp>2025-01-01T12:00:00Z</Timestamp>
			<Prompt>
				<Text>Hello AI</Text>
			</Prompt>
			<PrimaryResponse>
				<Text>Hello User</Text>
			</PrimaryResponse>
		</ConversationTurn>
	</ConversationTurns>
</Conversation>
`

const RICH_CONTENT_CONVERSATION = `
<Conversation>
	<ConversationId>c_987654321</ConversationId>
	<ConversationTopic>Rich Content Topic</ConversationTopic>
	<ConversationTurns>
		<ConversationTurn>
			<PrimaryResponse>
				<Text>Here is some code</Text>
				<ToolCode>console.log("hello")</ToolCode>
			</PrimaryResponse>
		</ConversationTurn>
	</ConversationTurns>
</Conversation>
`

describe('xml-parser', () => {
    it('extracts conversation ID correctly', () => {
        expect(getConversationId(SINGLE_CONVERSATION)).toBe('c_123456789')
    })

    it('extracts timestamp correctly', () => {
        expect(getConversationTimestamp(SINGLE_CONVERSATION)).toBe('2025-01-01T12:00:00Z')
    })

    it('extracts topic correctly', () => {
        expect(getConversationTitle(SINGLE_CONVERSATION)).toBe('Test Topic')
    })

    it('splits conversations correctly', () => {
        const xml = SINGLE_CONVERSATION + SINGLE_CONVERSATION
        const splits = splitConversationsXml(xml)
        expect(splits).toHaveLength(2)
        expect(splits[0]).toContain('c_123456789')
    })

    it('counts turns correctly', () => {
        // 1 turn * 2 (prompt + response) = 2
        expect(getTurnCount(SINGLE_CONVERSATION)).toBe(2)
    })

    it('detects rich content', () => {
        expect(hasRichContent(SINGLE_CONVERSATION)).toBe(false)
        expect(hasRichContent(RICH_CONTENT_CONVERSATION)).toBe(true)
    })

    it('parses transcript correctly', () => {
        const turns = parseConversationTranscript(SINGLE_CONVERSATION)
        expect(turns).toHaveLength(2)
        expect(turns[0].author).toBe('user')
        expect(turns[0].parts[0].content).toBe('Hello AI')
        expect(turns[1].author).toBe('model')
        expect(turns[1].parts[0].content).toBe('Hello User')
    })
})
