# Session Prompt: Microservices Restructure Phase 3

## Context

Continuing the ai-chats (Gemini Oracle) restructure from a monolithic Next.js app to a pnpm workspace with microservice packages.

## What's Done (Phase 1 & 2)

- Branch: `feature/microservices-restructure`
- Commits:
  1. `b09297b` - TypeScript fixes + branch strategy rule
  2. `08b403c` - pnpm-workspace.yaml + biome.json + 9 empty packages
  3. Phase 2 commit - Moved Next.js app into ai-chat--web/
  4. Phase 2 commit - Cleanup .next cache

Current structure:
```
ai-chats/
├── package.json              # Root workspace orchestrator
├── pnpm-workspace.yaml
├── biome.json
├── ai-chat--web/             # ✅ Next.js app (moved from root)
│   ├── src/
│   ├── package.json
│   └── tsconfig.json
├── ai-chat--backend/         # Empty placeholder
├── ai-chat--services/        # Empty placeholder
├── ai-chat--middleware/      # Empty placeholder
├── ai-chat--tests/           # Empty placeholder
├── ai-chat--infra/           # Empty placeholder
├── ai-chat--docs/            # Empty placeholder
├── ai-chat--seed-data/       # Empty placeholder
└── ai-chat--auth/            # Empty placeholder
```

## What to Do (Phase 3)

### Option A: Configure Package Dependencies (Safer)
Update the placeholder packages with proper dependencies without moving code yet:
- `ai-chat--services`: Add genkit dependencies (moved from web later)
- `ai-chat--backend`: Add pg, @aws-sdk/client-s3 (database/storage)
- `ai-chat--middleware`: Add zod, shared types

### Option B: Split Code (More Complex)
Move code from ai-chat--web into appropriate packages:
- `ai-chat--web/src/lib/database.ts` → `ai-chat--backend/`
- `ai-chat--web/src/lib/storage.ts` → `ai-chat--backend/`
- `ai-chat--web/src/types/*.ts` → `ai-chat--middleware/`
- `ai-chat--web/src/ai/**` → `ai-chat--services/`

## Reference Files

- Session 1 record: `.agent/sessions/1/session-record.md`
- proposal-prepper structure: `/Users/afla/Documents/Code/proposal-prepper`
- Current packages:
  - `ai-chat--web/package.json` (has all current deps)
  - `ai-chat--backend/package.json` (empty placeholder)

## Nix Environment

Always run commands with `nix develop -c <command>` for pnpm, tsc, etc.

## Recommendation

Start with **Option A** - configure package.json files first, commit, then tackle code splitting in a subsequent phase. This mirrors the successful approach from Phase 2.
