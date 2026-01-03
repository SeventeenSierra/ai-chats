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
    transcript TEXT,
    backlinked_at TIMESTAMPTZ,
    is_deep_research BOOLEAN DEFAULT FALSE,
    -- Retry tracking for failed processing
    retry_count INTEGER DEFAULT 0,
    last_error TEXT
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

CREATE TABLE IF NOT EXISTS thinking_traces (
    id SERIAL PRIMARY KEY,
    conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    step_number INTEGER NOT NULL,
    content TEXT,
    action_type TEXT,
    metadata_json JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_thinking_traces_conversation_id ON thinking_traces(conversation_id);

CREATE TABLE IF NOT EXISTS grounding_data (
    conversation_id TEXT PRIMARY KEY REFERENCES conversations(id) ON DELETE CASCADE,
    raw_chunks_json JSONB,
    raw_supports_json JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS binders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    color TEXT DEFAULT '#64748b',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Phase 2: Add Activity Type and Binder FK to conversations
-- Note: We use ALTER TABLE in the migration script for existing DBs, 
-- but we define the *desired state* here for fresh installs.
-- Since this file is for initialization, we can just add the columns if they don't exist
-- or rely on the migration script. For clarity, I'll append the ALTERs here 
-- so they run on new containers, or we can just update the CREATE definition above.

-- Updating the CREATE definition for 'conversations' is cleaner for new installs,
-- but since we are iterating, I will add them as discrete commands for safety/idempotency.

ALTER TABLE conversations ADD COLUMN IF NOT EXISTS activity_type TEXT CHECK (activity_type IN ('coding', 'research', 'writing', 'design', 'mixed', 'unknown'));
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS binder_id UUID REFERENCES binders(id) ON DELETE SET NULL;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_conversations_binder_id ON conversations(binder_id);
CREATE INDEX IF NOT EXISTS idx_conversations_activity_type ON conversations(activity_type);
