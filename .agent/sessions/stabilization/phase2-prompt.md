# Phase 2: Test Coverage Foundation

## Context

We're stabilizing the ai-chats codebase. This is Phase 2 of a 4-phase plan. Phase 1 (bug fixes) should be complete.

Read the full plan: `.gemini/antigravity/brain/f892be50-02bc-4517-80c4-7fb4b1b92761/implementation_plan.md`

## Your Task

1. Add unit tests for `backend/src/db-queries.ts` (17 functions, currently 0% tested):
   - Create `tests/src/db-queries.test.ts`
   - Use mocked database pool (no Docker required)
   - Prioritize: `getConversations`, `getConversationById`, `saveConversation`, `updateConversationById`, `getConversationsToFetch`

2. Add missing tests for `xml-parser.ts` functions not currently tested:
   - `getThinkingTraces`
   - `getGroundingData`
   - `detectActivityType`
   - `parseConversationXml`

3. Verify all tests pass:
   ```bash
   pnpm --filter @ai-chat/tests test
   pnpm --filter @ai-chat/tests test:e2e
   ```

## Success Criteria

- [ ] `db-queries.test.ts` exists with tests for critical functions
- [ ] All xml-parser functions have test coverage
- [ ] All unit and E2E tests pass
- [ ] Test coverage documented
