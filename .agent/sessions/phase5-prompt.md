# Phase 5: Pipeline E2E Testing & CI Verification

## Overview

This session focuses on completing the end-to-end testing of the import pipeline and verifying all CI workflows function correctly on GitHub.

## Objectives

### 1. Pipeline E2E Testing
- [ ] Verify the Pipeline dialog opens and accepts file uploads
- [ ] Test with the seed data file: `seed-data/alyssa@seventeensierra.com-uoU3kL.xml`
- [ ] Observe all pipeline stages: Upload → Split → Metadata → Transcripts → Backlinks → Review
- [ ] Document any issues with the pipeline processing

### 2. CLI Seed Script (Alternative)
If browser-based upload continues to have issues:
- [ ] Create a CLI script to import seed data directly via API
- [ ] Add to `package.json` scripts: `pnpm seed`
- [ ] Bypass browser file picker limitations for testing

### 3. Refactor XML Parser to Use `fast-xml-parser`
The current string-based parsing was a quick fix for ReDoS vulnerabilities. Consider refactoring to use a proper XML parser:
- [ ] Install `fast-xml-parser` (best OSSF security posture)
- [ ] Refactor `backend/src/xml-parser.ts` to use the library
- [ ] Remove manual indexOf/slice extraction logic
- [ ] Test with seed data to ensure correct parsing

### 3. Fix Hydration Issues
- [ ] Investigate Next.js hydration mismatch warning observed in dashboard
- [ ] Ensure server and client render consistently

### 4. GitHub CI Verification
- [ ] Push `feature/test-ci` branch to remote
- [ ] Verify CI workflow passes (Lint, Typecheck, Build)
- [ ] Verify Security workflow passes (Semgrep, Trivy, Gitleaks)
- [ ] Ensure SARIF uploads work with GitHub Advanced Security

### 5. Route Discoverability
- [ ] Consider adding `/pipeline` as a dedicated route (currently dialog-only)
- [ ] Or improve discoverability of the Pipeline menu option

## Context from Previous Session

### What Was Completed
1. Refactored `PipelineProgress` component to reduce cognitive complexity
2. Fixed `charts.tsx` typing issues
3. Added `hadolint`, `syft`, `trivy` to Nix devShell
4. Created `postgres.Containerfile` and `garage.Containerfile`
5. Updated `compose.yaml` to build all services from Containerfiles
6. Created `.trivyignore` for upstream image limitations
7. All local security audits pass (`./scripts/security-audit.sh`)

### Commits Made
- `refactor(ai-chats): decompose PipelineProgress and improve typings`
- `chore(ci): add hadolint and syft to dev env and audit script`
- `fix(infra): pin curl version in web container to satisfy hadolint`
- `chore(docker): create explicit containerfiles for all services`

### Branch
`feature/test-ci`

## Commands Reference

```bash
# Start containers
nix develop --command podman-compose up -d --build

# Run local CI
nix develop --command ./scripts/ci-local.sh

# Run security audit
nix develop --command ./scripts/security-audit.sh

# Check container status
nix develop --command podman-compose ps
```
