import fs from 'node:fs'
import path from 'node:path'
import Database from 'better-sqlite3'

const DATA_DIR = process.env.GEMINI_DATA_DIR
	? path.resolve(process.env.GEMINI_DATA_DIR)
	: path.resolve(process.cwd(), '../data')
const DB_PATH = path.join(DATA_DIR, 'gemini.db')

// Ensure data dir exists
if (!fs.existsSync(DATA_DIR)) {
	fs.mkdirSync(DATA_DIR, { recursive: true })
}

console.log(`Initializing database at ${DB_PATH}...`)
const db = new Database(DB_PATH)

// Enable WAL mode for concurrency
db.pragma('journal_mode = WAL')

// Define Schema
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
    transcript TEXT, -- JSON stored as text
    FOREIGN KEY(category) REFERENCES categories(name) ON UPDATE CASCADE ON DELETE SET NULL
  );

  CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON conversations(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_conversations_category ON conversations(category);
  CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status);
`

try {
	db.exec(schema)
	console.log('✅ Database initialized successfully.')
} catch (err) {
	console.error('❌ Error initializing database:', err)
	process.exit(1)
}
