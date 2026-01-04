import fs from 'node:fs'
import path from 'node:path'
import Database from 'better-sqlite3'

let _db: Database.Database | null = null

export function getDb(): Database.Database {
	if (!_db) {
		const DATA_DIR = process.env.GEMINI_DATA_DIR
			? path.resolve(process.env.GEMINI_DATA_DIR)
			: path.resolve(process.cwd(), 'data')
		const dbPath = path.join(DATA_DIR, 'gemini.db')
		const dir = path.dirname(dbPath)
		if (!fs.existsSync(dir)) {
			fs.mkdirSync(dir, { recursive: true })
		}
		_db = new Database(dbPath)
		_db.pragma('journal_mode = WAL')
	}
	return _db
}
