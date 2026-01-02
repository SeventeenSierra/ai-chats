# Session Prompt: Microservices Restructure Phase 2

## Context

I'm restructuring the ai-chats (Gemini Oracle) project from a monolithic Next.js app to a pnpm workspace with microservice packages, following the proposal-prepper pattern.

## What's Done (Phase 1)

- Branch: `feature/microservices-restructure`
- Commits:
  1. `b09297b` - TypeScript fixes + branch strategy rule
  2. `08b403c` - pnpm-workspace.yaml + biome.json + 9 empty packages

Current structure:
```
ai-chats/
├── pnpm-workspace.yaml
├── biome.json
├── ai-chat--web/package.json       # Empty placeholder
├── ai-chat--backend/package.json   # Empty placeholder
├── ai-chat--services/package.json  # Empty placeholder
├── ai-chat--middleware/package.json
├── ai-chat--infra/package.json
├── ai-chat--tests/package.json
├── ai-chat--docs/package.json
├── ai-chat--seed-data/package.json
├── ai-chat--auth/package.json
└── src/                            # Original monolithic code (still here)
```

## What to Do (Phase 2)

Reference `/Users/afla/Documents/Code/proposal-prepper` for how the workspace packages are structured:
- Look at `proposal-prepper-web/package.json` for web dependencies
- Look at `proposal-prepper-services/package.json` for services pattern
- Look at `proposal-prepper-middleware/package.json` for shared utils

Update the ai-chat--* package.json files with:
1. Proper dependencies (moved from root package.json)
2. Scripts (dev, build, lint, typecheck)
3. tsconfig.json files
4. Workspace references where packages depend on each other

**Important**: Commit after updating package.json files, BEFORE attempting any code migration.

## Key Files to Reference

- Root: `/Users/afla/Documents/Code/ai-chats/package.json` (current dependencies)
- Reference: `/Users/afla/Documents/Code/proposal-prepper/pnpm-workspace.yaml`
- Reference: `/Users/afla/Documents/Code/proposal-prepper/proposal-prepper-web/package.json`

## Nix Environment

Always run commands with `nix develop -c <command>` for pnpm, tsc, etc.
