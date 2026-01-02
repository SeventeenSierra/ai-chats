<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<!-- SPDX-FileCopyrightText: 2025 Seventeen Sierra LLC -->

# Phase 4 Prompt: Polylith Restructure

## Context

Continuing microservices restructure of `ai-chats`. Phases 1-3 complete:
- Firebase removed, PostgreSQL/S3 backend working
- Package folders created but using old naming convention
- Branch: `feature/microservices-restructure` (7 commits)

## Goal

Restructure to match 17s-mono polylith pattern for eventual import.

## Reference Repository

See `/Users/afla/Documents/Code/17s-mono` for structure examples:
- `apps/dashboard/` - App structure
- `shared/` - Types, hooks, utils
- `ui/` - Shadcn components (71 components)
- `ai/` - Genkit flows with core/flows structure

## Target Structure

```
ai-chats/
├── apps/web/             # @ai-chat/web
├── shared/               # @ai-chat/shared (types, hooks, utils)
├── ui/                   # @ai-chat/ui (shadcn components)
├── ai/                   # @ai-chat/ai (genkit flows)
├── backend/              # @ai-chat/backend (db, storage)
├── infra/                # @ai-chat/infra
├── tests/                # @ai-chat/tests
└── seed-data/            # @ai-chat/seed-data
```

## Migration Order

1. **shared/** - Extract types, hooks, utils from web
2. **ui/** - Extract components/ui/ from web
3. **backend/** - Extract database.ts, storage.ts, db-queries.ts
4. **ai/** - Extract genkit.ts and flows/
5. **apps/web/** - Rename ai-chat--web, update workspace
6. **Cleanup** - Delete old ai-chat--* packages

## Key Decisions

- Use `@ai-chat/*` namespace for packages
- Use `apps/web/` structure (matches 17s-mono)
- Local ui package now, migrate to @17sierra/ui later

## Verification

After each step:
```bash
nix develop -c pnpm install
nix develop -c pnpm -r run typecheck
```
