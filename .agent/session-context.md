# Session Context

## Project: Gemini Oracle

A Next.js application for importing, exploring, and analyzing Gemini conversation exports.

## Tech Stack

- **Frontend**: Next.js 16, React 19, Tailwind CSS v4
- **Database**: PostgreSQL (via Podman/Docker)
- **Storage**: MinIO (S3-compatible, via Podman/Docker)
- **Package Manager**: pnpm 10.27.0 (Monorepo)

## Current State

- RESTORED: Monorepo structure with `pnpm` workspaces
- UPGRADED: Tailwind CSS v4 (CSS-first)
- FIXED: Native binary support for ARM64 containers
- 491 conversations imported

## Key Files

- `compose.yaml` - PostgreSQL and MinIO containers
- `src/lib/database.ts` - PostgreSQL connection
- `src/lib/storage.ts` - MinIO/S3 client
- `src/lib/db-queries.ts` - Database operations
- `src/app/api/import/route.ts` - Import API

## Running Locally

```bash
podman-compose up -d postgres minio
pnpm dev
```

## Active Development

Check `.agent/sessions/` for recent work.
