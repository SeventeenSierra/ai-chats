import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Database from 'better-sqlite3'

describe('SQLite Database (Postgres Replacement)', () => {
    let db: Database.Database

    beforeEach(() => {
        // Use in-memory DB for isolation
        db = new Database(':memory:')

        // Enable WAL
        db.pragma('journal_mode = WAL')

        // Apply Schema (Replicated from backend/scripts/init_db.ts)
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
		
			CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON conversations(created_at DESC);
			CREATE INDEX IF NOT EXISTS idx_conversations_category ON conversations(category);
			CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status);
		`
        db.exec(schema)
    })

    afterEach(() => {
        db.close()
    })

    it('should support basic CRUD operations on conversations', () => {
        // 1. Insert
        const stmt = db.prepare(`
			INSERT INTO conversations (id, title, created_at, transcript, turn_count)
			VALUES (?, ?, ?, ?, ?)
		`)
        const info = stmt.run('c_test_1', 'Test Conversation', '2025-01-01T00:00:00Z', '[]', 2)
        expect(info.changes).toBe(1)

        // 2. Select
        const row = db.prepare('SELECT * FROM conversations WHERE id = ?').get('c_test_1') as any
        expect(row).toBeDefined()
        expect(row.title).toBe('Test Conversation')
        expect(row.turn_count).toBe(2)

        // 3. Update
        const update = db.prepare('UPDATE conversations SET status = ? WHERE id = ?')
        update.run('archived', 'c_test_1')

        const updatedRow = db.prepare('SELECT status FROM conversations WHERE id = ?').get('c_test_1') as any
        expect(updatedRow.status).toBe('archived')

        // 4. Delete
        const del = db.prepare('DELETE FROM conversations WHERE id = ?')
        del.run('c_test_1')

        const deletedRow = db.prepare('SELECT * FROM conversations WHERE id = ?').get('c_test_1')
        expect(deletedRow).toBeUndefined()
    })

    it('should enforce category foreign key constraints', () => {
        // Insert category
        db.prepare('INSERT INTO categories (name) VALUES (?)').run('Coding')

        // Insert conversation with valid category
        const stmt = db.prepare(`
			INSERT INTO conversations (id, created_at, category)
			VALUES (?, ?, ?)
		`)
        stmt.run('c_cat_1', '2025-01-01', 'Coding')

        const row = db.prepare('SELECT category FROM conversations WHERE id = ?').get('c_cat_1') as any
        expect(row.category).toBe('Coding')

        // Verify FK constraint (SQLite doesn't enforce FKs by default unless enabled, 
        // but checking that the schema allows relations is key)
        // Enable foreign keys
        db.pragma('foreign_keys = ON')

        // Deleting category should check constraint behavior (ON DELETE SET NULL)
        db.prepare('DELETE FROM categories WHERE name = ?').run('Coding')

        const check = db.prepare('SELECT category FROM conversations WHERE id = ?').get('c_cat_1') as any
        expect(check.category).toBeNull()
    })
})
