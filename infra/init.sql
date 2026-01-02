-- Gemini Oracle Database Schema

CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    created_at TIMESTAMPTZ,
    status TEXT DEFAULT 'processed' CHECK (status IN ('processed', 'quarantined', 'archived')),
    has_rich_content BOOLEAN DEFAULT FALSE,
    first_prompt TEXT,
    first_response TEXT,
    turn_count INTEGER DEFAULT 0,
    char_count INTEGER DEFAULT 0,
    category TEXT,
    storage_filename TEXT,
    summary TEXT,
    summarized_at TIMESTAMPTZ,
    categorized_at TIMESTAMPTZ,
    backlinked_at TIMESTAMPTZ,
    is_deep_research BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS categories (
    name TEXT PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS import_jobs (
    id TEXT PRIMARY KEY,
    status TEXT NOT NULL CHECK (status IN ('starting', 'splitting', 'processing', 'enriching', 'staged', 'completed', 'failed', 'cancelled')),
    filename TEXT,
    message TEXT,
    total INTEGER DEFAULT 0,
    processed INTEGER DEFAULT 0,
    progress INTEGER DEFAULT 0,
    error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON conversations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_category ON conversations(category);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status);
CREATE INDEX IF NOT EXISTS idx_import_jobs_status ON import_jobs(status);
