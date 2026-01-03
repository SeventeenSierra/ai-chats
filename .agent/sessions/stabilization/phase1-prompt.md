# Phase 1: Immediate Bug Fixes

## Context

We're stabilizing the ai-chats codebase. This is Phase 1 of a 4-phase plan.

Read the full plan: `.gemini/antigravity/brain/f892be50-02bc-4517-80c4-7fb4b1b92761/implementation_plan.md`

## Your Task

1. Fix `getConversationsToFetch()` in `backend/src/db-queries.ts`:
   - Add `AND transcript IS NULL` to the WHERE clause
   - This is the root cause of transcripts not being fetched

2. Verify the fix:
   - Run the dev server
   - Wipe data, import seed data, fetch transcripts
   - Confirm transcripts now appear in the explorer

3. Run existing tests to ensure nothing broke:
   ```bash
   pnpm --filter @ai-chat/tests test
   ```

## Success Criteria

- [ ] `getConversationsToFetch()` only returns conversations missing transcripts
- [ ] Manual test confirms transcripts are fetched after import
- [ ] Existing unit tests pass
