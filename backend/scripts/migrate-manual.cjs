// SPDX-License-Identifier: AGPL-3.0-or-later

const { Client } = require('pg');

const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/gemini_oracle',
});

async function migrate() {
    try {
        await client.connect();
        console.log('Connected to database.');

        await client.query('BEGIN');

        const sql = `
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

      -- Phase 2: Binders & Activities
      CREATE TABLE IF NOT EXISTS binders (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          title TEXT NOT NULL,
          description TEXT,
          color TEXT DEFAULT '#64748b',
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      ALTER TABLE conversations 
      ADD COLUMN IF NOT EXISTS activity_type TEXT CHECK (activity_type IN ('coding', 'research', 'writing', 'design', 'mixed', 'unknown'));

      ALTER TABLE conversations 
      ADD COLUMN IF NOT EXISTS binder_id UUID REFERENCES binders(id) ON DELETE SET NULL;
      
      ALTER TABLE conversations 
      ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;

      CREATE INDEX IF NOT EXISTS idx_conversations_binder_id ON conversations(binder_id);
      CREATE INDEX IF NOT EXISTS idx_conversations_activity_type ON conversations(activity_type);
    `;

        await client.query(sql);
        await client.query('COMMIT');
        console.log('Migration applied successfully.');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Migration failed:', err);
        process.exit(1);
    } finally {
        await client.end();
    }
}

migrate();
