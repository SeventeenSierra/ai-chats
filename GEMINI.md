<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<!-- SPDX-FileCopyrightText: 2025 Seventeen Sierra LLC -->

# AI Agent Integration Guide

This document outlines patterns and best practices for AI agents working on Gemini Oracle.

---

## ⚠️ CRITICAL: Session Rules (ALWAYS APPLY)

**Read `.agent/AGENT_RULES.md` at session start.** Key rules:

1. **Self-identify**: "I am [Agent] powered by [Model]. Trailer: AI-Agent: [value]"
2. **Read context**: `.agent/session-context.md`
3. **Blocking review**: Present checklist before commits, WAIT for human approval
4. **Human signs off**: Only human runs `git commit -s`
5. **Session record**: Create `.agent/sessions/<N>/session-record.md`

---

## Core Philosophy

- **Respect AI Zones:** Follow `.ai-zones.yaml` permissions
- **Human Involvement Levels:** full | reviewed | approved | automated
- **Monorepo Structure:** pnpm workspace with `ai-chat--*` packages

## Commit Scopes

Use these scopes for conventional commits:

| Scope | Description |
|-------|-------------|
| `web` | Next.js pages and components |
| `api` | API routes |
| `lib` | Library code (database, storage, xml-parser) |
| `ui` | UI components |
| `db` | Database schema and queries |
| `storage` | S3/Garage storage |
| `deps` | Dependencies |
| `config` | Configuration files |
| `ci` | CI/CD and workflows |
| `docs` | Documentation |
| `services` | Genkit AI flows |
| `infra` | Infrastructure (Docker, migrations) |
