
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

CREATE TABLE IF NOT EXISTS import_jobs (
  id TEXT PRIMARY KEY,
  status TEXT,
  filename TEXT,
  message TEXT,
  total INTEGER DEFAULT 0,
  processed INTEGER DEFAULT 0,
  progress INTEGER DEFAULT 0,
  error TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
