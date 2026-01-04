import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import Database from 'better-sqlite3'

// 1. Mock getDb BEFORE importing modules that use it
const db = new Database(':memory:')
db.pragma('journal_mode = WAL')

// Apply Schema (Replicated for test isolation - keeping usage of production code limited to logic, not config)
const schema = `
  CREATE TABLE IF NOT EXISTS categories (
    name TEXT PRIMARY KEY
  );

  CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    title TEXT,
    created_at TEXT NOT NULL,
    status TEXT DEFAULT 'processed',
    has_rich_content INTEGER DEFAULT 0,
    first_prompt TEXT,
    first_response TEXT,
    turn_count INTEGER DEFAULT 0,
    char_count INTEGER DEFAULT 0,
    storage_filename TEXT,
    category TEXT,
    summary TEXT,
    summarized_at TEXT,
    categorized_at TEXT,
    backlinked_at TEXT,
    is_deep_research INTEGER DEFAULT 0,
    transcript TEXT,
    FOREIGN KEY(category) REFERENCES categories(name) ON UPDATE CASCADE ON DELETE SET NULL
  );
`
db.exec(schema)

// Mock the module
vi.mock('@ai-chat/backend/database', () => ({
    getDb: () => db
}))

// 2. Import functions AFTER mock setup
import { saveConversation, getConversations } from '@ai-chat/backend/queries'
import { splitConversationsXml, getConversationId, getConversationTitle, parseConversationTranscript } from '@ai-chat/backend/xml-parser'

const TEST_XML = `
<Conversation>
	<ConversationId>c_import_test_1</ConversationId>
	<ConversationTopic>Import Integration Test</ConversationTopic>
	<Timestamp>2025-02-01T10:00:00Z</Timestamp>
	<ConversationTurns>
		<ConversationTurn>
			<Timestamp>2025-02-01T10:00:00Z</Timestamp>
			<Prompt>
				<Text>Import this!</Text>
			</Prompt>
			<PrimaryResponse>
				<Text>Imported successfully.</Text>
			</PrimaryResponse>
		</ConversationTurn>
	</ConversationTurns>
</Conversation>
`

describe('Import Flow Integration (XML -> DB)', () => {
    beforeEach(() => {
        // Clear DB between tests
        db.prepare('DELETE FROM conversations').run()
    })

    it('should parse XML and save to database successfully', async () => {
        // 1. Simulate the "Upload/Import" logic found in the API route
        const conversations = splitConversationsXml(TEST_XML)
        expect(conversations).toHaveLength(1)

        const xml = conversations[0]
        const id = getConversationId(xml)
        const title = getConversationTitle(xml)
        const transcript = parseConversationTranscript(xml)

        expect(id).toBe('c_import_test_1')
        expect(title).toBe('Import Integration Test')

        // 2. Call the DB save function
        await saveConversation({
            id: id!,
            title: title!,
            createdAt: new Date().toISOString(),
            turnCount: transcript.length, // Logic from import route
            storageFilename: 'test.xml',
            status: 'processed'
        })

        // 3. Verify Persistence
        const savedConvos = await getConversations()
        expect(savedConvos).toHaveLength(1)
        expect(savedConvos[0].id).toBe('c_import_test_1')
        expect(savedConvos[0].title).toBe('Import Integration Test')

        // Verify default fields logic
        expect(savedConvos[0].status).toBe('processed')
    })
})
